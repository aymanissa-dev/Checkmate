import fs from "node:fs/promises";
import path from "node:path";
import {
  FindingsDocumentSchema,
  TrajectorySchema,
  type Trajectory,
  type TrajectoryStep,
} from "@checkmate/schemas";
import { createCaseSandbox } from "@checkmate/sandbox";
import type { ModelProvider, ChatMessage, ToolSpec } from "./provider.js";
import { MockModelProvider } from "./mock-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import { HuggingFaceProvider } from "./huggingface-provider.js";
import { getProviderFromEnv } from "./provider.js";

export const BASELINE_SYSTEM_PROMPT = `You are a senior software engineer performing a one-shot critical review.

Review the application in the workspace for CRITICAL correctness, security, and reliability defects.
Focus on: authorization bugs, injection, SSRF, race conditions, path traversal, missing integrity checks, false-green tests, secret leakage, and consistency violations.

Tools available (same surface Checkmate will use later):
- list_files: list directory contents under the workspace
- read_file: read a file
- search: substring search across source files
- run_command: run a shell command with cwd restricted to the workspace

Constraints:
- Do NOT invent issues without code evidence.
- Prefer fewer high-severity findings over many speculative ones.
- Output structured findings JSON when finished (FindingsDocument).
- There is NO separate mental-model stage and NO forced verify stage in this baseline.
`;

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "list_files",
    description: "List files in a relative directory under the case app workspace",
    parameters: { path: { type: "string" } },
  },
  {
    name: "read_file",
    description: "Read a text file from the workspace",
    parameters: { path: { type: "string" } },
  },
  {
    name: "search",
    description: "Substring search across source files",
    parameters: {
      pattern: { type: "string" },
      path: { type: "string" },
    },
  },
  {
    name: "run_command",
    description: "Run a shell command (cwd restricted to workspace)",
    parameters: {
      command: { type: "string" },
      cwd: { type: "string" },
    },
  },
];

export interface BaselineBudget {
  maxToolCalls: number;
  maxWallTimeMs: number;
}

export interface BaselineRunOptions {
  caseId: string;
  caseAppDir: string;
  artifactsDir: string;
  trajectoriesDir: string;
  repoRoot: string;
  budget?: Partial<BaselineBudget>;
  provider?: ModelProvider;
  /** Force mock even if keys present (CI). */
  forceMock?: boolean;
}

export interface BaselineRunResult {
  caseId: string;
  runId: string;
  mode: string;
  findingsPath: string;
  trajectoryPath: string;
  toolCalls: number;
  note: string;
  /** True when findings came from mock/fixture — not a real model eval. */
  isMockEval: boolean;
}

const DEFAULT_BUDGET: BaselineBudget = {
  maxToolCalls: 40,
  maxWallTimeMs: 180_000,
};

export function resolveProvider(
  caseId: string,
  forceMock?: boolean,
): { provider: ModelProvider; mode: string; note: string; isMock: boolean } {
  if (forceMock) {
    return {
      provider: new MockModelProvider(caseId),
      mode: "mock",
      note: "Forced mock/dry-run (harness smoke only — NOT a real model evaluation)",
      isMock: true,
    };
  }
  const env = getProviderFromEnv();
  if (env.mode === "mock") {
    return {
      provider: new MockModelProvider(caseId),
      mode: "mock",
      note: `${env.note} — harness smoke only, NOT a real model evaluation`,
      isMock: true,
    };
  }
  if (env.mode === "openai") {
    return {
      provider: new OpenAIProvider(),
      mode: "openai",
      note: env.note,
      isMock: false,
    };
  }
  if (env.mode === "huggingface") {
    return {
      provider: new HuggingFaceProvider(),
      mode: "huggingface",
      note: env.note,
      isMock: false,
    };
  }
  if (env.mode === "anthropic") {
    // Anthropic wiring deferred — fall back to clear skip message via mock stub
    // with empty findings would fabricate. Instead throw for real path.
    throw new Error(
      "Anthropic provider selected but not yet implemented. Default provider is huggingface (HF_TOKEN); or set CHECKMATE_MODEL_PROVIDER=openai|mock",
    );
  }
  // No key: default to mock for local/CI, with clear labeling
  return {
    provider: new MockModelProvider(caseId),
    mode: "mock",
    note: `${env.note}. Defaulting to mock for dry-run.`,
    isMock: true,
  };
}

export async function runBaseline(
  opts: BaselineRunOptions,
): Promise<BaselineRunResult> {
  const budget: BaselineBudget = {
    ...DEFAULT_BUDGET,
    ...opts.budget,
  };
  const runId = `baseline-${opts.caseId}-${Date.now()}`;
  const startedAt = new Date();
  const { provider, mode, note, isMock } =
    opts.provider
      ? {
          provider: opts.provider,
          mode: opts.provider.name,
          note: "Custom provider",
          isMock: opts.provider.name === "mock",
        }
      : resolveProvider(opts.caseId, opts.forceMock);

  const sandbox = createCaseSandbox({
    workspaceRoot: opts.caseAppDir,
    deniedPathFragments: ["truth.json"],
  });

  const messages: ChatMessage[] = [
    { role: "system", content: BASELINE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Case ID: ${opts.caseId}\nWorkspace root is the application under review. Explore it with tools and return critical findings as FindingsDocument JSON.\nDo not attempt to read any ground-truth or scorer files — they are not in this workspace.`,
    },
  ];

  const steps: TrajectoryStep[] = [
    {
      index: 0,
      type: "message",
      role: "system",
      content: BASELINE_SYSTEM_PROMPT,
      timestamp: startedAt.toISOString(),
    },
    {
      index: 1,
      type: "message",
      role: "user",
      content: messages[1]!.content,
      timestamp: startedAt.toISOString(),
    },
  ];

  let toolCalls = 0;
  let findingsRaw = "";
  let stepIdx = 0;

  while (true) {
    const wall = Date.now() - startedAt.getTime();
    if (wall > budget.maxWallTimeMs) {
      findingsRaw = emptyFindings(opts.caseId);
      steps.push({
        index: steps.length,
        type: "final",
        role: "assistant",
        content: "Budget exceeded (wall time); emitting empty findings.",
        timestamp: new Date().toISOString(),
      });
      break;
    }
    if (toolCalls >= budget.maxToolCalls) {
      findingsRaw = emptyFindings(opts.caseId);
      steps.push({
        index: steps.length,
        type: "final",
        role: "assistant",
        content: "Budget exceeded (tool calls); emitting empty findings.",
        timestamp: new Date().toISOString(),
      });
      break;
    }

    const action = await provider.nextAction({
      messages,
      tools: TOOL_SPECS,
      step: stepIdx,
    });
    stepIdx += 1;

    if (action.type === "tool_call") {
      toolCalls += 1;
      steps.push({
        index: steps.length,
        type: "tool_call",
        role: "assistant",
        toolName: action.toolName,
        toolArgs: action.toolArgs,
        content: action.assistantText,
        timestamp: new Date().toISOString(),
      });
      messages.push({
        role: "assistant",
        content: JSON.stringify({
          type: "tool_call",
          toolName: action.toolName,
          toolArgs: action.toolArgs,
        }),
      });

      let result: string;
      try {
        result = await sandbox.invokeTool(action.toolName, action.toolArgs);
      } catch (err) {
        result = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
      }

      steps.push({
        index: steps.length,
        type: "tool_result",
        role: "tool",
        toolName: action.toolName,
        toolResult: result.slice(0, 50_000),
        timestamp: new Date().toISOString(),
      });
      messages.push({
        role: "tool",
        name: action.toolName,
        content: result.slice(0, 50_000),
      });
      continue;
    }

    // final
    findingsRaw = action.findingsJson;
    steps.push({
      index: steps.length,
      type: "final",
      role: "assistant",
      content: action.assistantText ?? action.findingsJson.slice(0, 4000),
      timestamp: new Date().toISOString(),
    });
    break;
  }

  const finishedAt = new Date();
  let findingsDoc;
  try {
    const parsed = JSON.parse(findingsRaw) as Record<string, unknown>;
    if (!parsed.caseId) parsed.caseId = opts.caseId;
    if (!parsed.producedBy) {
      parsed.producedBy = isMock ? "fixture" : "baseline";
    }
    if (!parsed.schemaVersion) parsed.schemaVersion = 1;
    if (Array.isArray(parsed.findings)) {
      parsed.findings = (parsed.findings as Record<string, unknown>[]).map(
        (f, i) => ({
          ...f,
          schemaVersion: 1,
          id: f.id ?? `F${i + 1}`,
          proofIds: f.proofIds ?? [],
          locators: f.locators ?? [],
          matchKeys: f.matchKeys ?? [],
        }),
      );
    }
    findingsDoc = FindingsDocumentSchema.parse(parsed);
  } catch (err) {
    console.warn(
      `[baseline] findings parse failed for ${opts.caseId}:`,
      err instanceof Error ? err.message : err,
    );
    findingsDoc = FindingsDocumentSchema.parse({
      schemaVersion: 1,
      caseId: opts.caseId,
      producedBy: isMock ? "fixture" : "baseline",
      findings: [],
    });
  }

  await fs.mkdir(opts.artifactsDir, { recursive: true });
  await fs.mkdir(opts.trajectoriesDir, { recursive: true });

  const findingsPath = path.join(opts.artifactsDir, "findings.json");
  await fs.writeFile(
    findingsPath,
    JSON.stringify(findingsDoc, null, 2) + "\n",
  );

  const trajectory: Trajectory = TrajectorySchema.parse({
    schemaVersion: 1,
    caseId: opts.caseId,
    runId,
    agent: isMock ? "fixture" : "baseline",
    model: provider.model,
    provider: mode,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    budget: {
      maxToolCalls: budget.maxToolCalls,
      maxWallTimeMs: budget.maxWallTimeMs,
    },
    usage: {
      toolCalls,
      wallTimeMs: finishedAt.getTime() - startedAt.getTime(),
    },
    steps,
    findingsPath: path.relative(opts.repoRoot, findingsPath),
    notes: note,
  });

  const trajectoryPath = path.join(
    opts.trajectoriesDir,
    `${runId}.json`,
  );
  await fs.writeFile(
    trajectoryPath,
    JSON.stringify(trajectory, null, 2) + "\n",
  );

  // Also write a stable latest pointer under artifacts
  await fs.writeFile(
    path.join(opts.artifactsDir, "trajectory.json"),
    JSON.stringify(trajectory, null, 2) + "\n",
  );

  return {
    caseId: opts.caseId,
    runId,
    mode,
    findingsPath,
    trajectoryPath,
    toolCalls,
    note,
    isMockEval: isMock,
  };
}

function emptyFindings(caseId: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    caseId,
    producedBy: "baseline",
    findings: [],
  });
}
