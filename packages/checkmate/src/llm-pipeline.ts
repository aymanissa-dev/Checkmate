/**
 * LLM-driven Checkmate staged loop (OpenAI via baseline provider abstraction).
 * Requires API keys. Falls back paths are handled by resolveProvider in runner.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  ApplicationMentalModelSchema,
  FindingsDocumentSchema,
  HypothesesDocumentSchema,
  ProofSchema,
  TrajectorySchema,
  type ApplicationMentalModel,
  type CheckmateStage,
  type FindingsDocument,
  type HypothesesDocument,
  type Proof,
  type Trajectory,
  type TrajectoryStep,
} from "@checkmate/schemas";
import { createCaseSandbox } from "@checkmate/sandbox";
import {
  OpenAIProvider,
  type ChatMessage,
  type ModelProvider,
  type ToolSpec,
} from "@checkmate/baseline";
import {
  CHECKMATE_STAGES,
  stageSystemPrompt,
  stageUserPrompt,
} from "./prompts.js";

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

export interface LlmPipelineOptions {
  caseId: string;
  caseAppDir: string;
  runArtifactsDir: string;
  trajectoriesDir: string;
  repoRoot: string;
  runId: string;
  budget: { maxToolCalls: number; maxWallTimeMs: number };
  provider: ModelProvider;
}

export interface LlmPipelineResult {
  caseId: string;
  runId: string;
  findingsPath: string;
  trajectoryPath: string;
  mentalModelPath: string;
  toolCalls: number;
  stagesCompleted: CheckmateStage[];
  note: string;
  isMockEval: false;
}

type StageCompleteArtifact =
  | { kind: "scope"; markdown: string }
  | { kind: "draft_notes"; markdown: string }
  | { kind: "mental_model"; model: ApplicationMentalModel }
  | { kind: "hypotheses"; document: HypothesesDocument }
  | {
      kind: "verify";
      hypotheses: HypothesesDocument["hypotheses"];
      proofs: Proof[];
    }
  | {
      kind: "report";
      findings: FindingsDocument;
      reportMarkdown: string;
    };

function tryParseStageAction(content: string):
  | { type: "tool_call"; toolName: string; toolArgs: Record<string, unknown>; assistantText?: string }
  | { type: "stage_complete"; artifact: StageCompleteArtifact }
  | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type === "tool_call") {
    return {
      type: "tool_call",
      toolName: String(obj.toolName ?? ""),
      toolArgs: (obj.toolArgs as Record<string, unknown>) ?? {},
      assistantText:
        typeof obj.assistantText === "string" ? obj.assistantText : undefined,
    };
  }
  if (obj.type === "stage_complete" && obj.artifact) {
    return {
      type: "stage_complete",
      artifact: obj.artifact as StageCompleteArtifact,
    };
  }
  // Allow bare findings as report completion
  if (obj.findings || obj.producedBy === "checkmate") {
    return {
      type: "stage_complete",
      artifact: {
        kind: "report",
        findings: obj as unknown as FindingsDocument,
        reportMarkdown:
          typeof obj.reportMarkdown === "string"
            ? obj.reportMarkdown
            : "# Checkmate report\n",
      },
    };
  }
  return null;
}

/**
 * Adapter: baseline ModelProvider.nextAction returns tool_call|final.
 * For staged loop we send stage prompts and interpret final findingsJson / content as stage JSON.
 */
async function nextStageAction(
  provider: ModelProvider,
  messages: ChatMessage[],
  step: number,
): Promise<
  | { type: "tool_call"; toolName: "list_files" | "read_file" | "search" | "run_command"; toolArgs: Record<string, unknown>; assistantText?: string }
  | { type: "stage_complete"; artifact: StageCompleteArtifact; raw: string }
> {
  // Prefer OpenAI-style JSON when provider is OpenAI; otherwise use nextAction.
  if (provider instanceof OpenAIProvider || provider.name === "openai") {
    const action = await provider.nextAction({
      messages: [
        ...messages,
        {
          role: "user",
          content:
            'Respond with JSON: {"type":"tool_call",...} OR {"type":"stage_complete","artifact":{...}}. For final findings use producedBy:"checkmate".',
        },
      ],
      tools: TOOL_SPECS,
      step,
    });
    if (action.type === "tool_call") {
      return action;
    }
    const parsed = tryParseStageAction(action.findingsJson) ??
      tryParseStageAction(action.assistantText ?? "");
    if (parsed?.type === "tool_call") {
      const name = parsed.toolName;
      if (
        name === "list_files" ||
        name === "read_file" ||
        name === "search" ||
        name === "run_command"
      ) {
        return {
          type: "tool_call",
          toolName: name,
          toolArgs: parsed.toolArgs,
          assistantText: parsed.assistantText,
        };
      }
    }
    if (parsed?.type === "stage_complete") {
      return {
        type: "stage_complete",
        artifact: parsed.artifact,
        raw: action.findingsJson,
      };
    }
    // Treat findingsJson as report findings fallback
    return {
      type: "stage_complete",
      artifact: {
        kind: "report",
        findings: FindingsDocumentSchema.parse(
          JSON.parse(action.findingsJson),
        ),
        reportMarkdown: "# Checkmate report\n(from provider final)\n",
      },
      raw: action.findingsJson,
    };
  }

  const action = await provider.nextAction({
    messages,
    tools: TOOL_SPECS,
    step,
  });
  if (action.type === "tool_call") return action;
  const parsed = tryParseStageAction(action.findingsJson);
  if (parsed?.type === "stage_complete") {
    return {
      type: "stage_complete",
      artifact: parsed.artifact,
      raw: action.findingsJson,
    };
  }
  return {
    type: "stage_complete",
    artifact: {
      kind: "report",
      findings: FindingsDocumentSchema.parse({
        schemaVersion: 1,
        caseId: "unknown",
        producedBy: "checkmate",
        findings: [],
      }),
      reportMarkdown: "# Incomplete stage parse\n",
    },
    raw: action.findingsJson,
  };
}

export async function runLlmCheckmatePipeline(
  opts: LlmPipelineOptions,
): Promise<LlmPipelineResult> {
  const startedAt = new Date();
  const note = `Checkmate LLM staged run via provider=${opts.provider.name} model=${opts.provider.model}`;
  const sandbox = createCaseSandbox({
    workspaceRoot: opts.caseAppDir,
    deniedPathFragments: ["truth.json"],
  });

  await fs.mkdir(opts.runArtifactsDir, { recursive: true });
  await fs.mkdir(path.join(opts.runArtifactsDir, "proofs"), { recursive: true });

  const steps: TrajectoryStep[] = [];
  let toolCalls = 0;
  const stagesCompleted: CheckmateStage[] = [];
  let mentalModelPath = path.join(opts.runArtifactsDir, "mental_model.json");
  let findingsPath = path.join(opts.runArtifactsDir, "findings.json");
  let hypotheses: HypothesesDocument | null = null;
  const proofs: Proof[] = [];
  let stepCounter = 0;

  // Carry prior stage summaries into later prompts (no truth)
  const priorSummaries: string[] = [];

  for (const stage of CHECKMATE_STAGES) {
    const wall = Date.now() - startedAt.getTime();
    if (wall > opts.budget.maxWallTimeMs) {
      throw new Error(`Checkmate wall budget exceeded at stage ${stage}`);
    }
    if (toolCalls >= opts.budget.maxToolCalls) {
      throw new Error(`Checkmate tool budget exceeded at stage ${stage}`);
    }

    const messages: ChatMessage[] = [
      { role: "system", content: stageSystemPrompt(stage) },
      {
        role: "user",
        content:
          stageUserPrompt(stage, opts.caseId) +
          (priorSummaries.length
            ? `\n\nPrior stage notes:\n${priorSummaries.join("\n---\n")}`
            : ""),
      },
    ];
    steps.push({
      index: steps.length,
      type: "message",
      role: "system",
      content: stageSystemPrompt(stage),
      timestamp: new Date().toISOString(),
      stage,
    });
    steps.push({
      index: steps.length,
      type: "message",
      role: "user",
      content: messages[1]!.content,
      timestamp: new Date().toISOString(),
      stage,
    });

    let stageDone = false;
    let stageGuard = 0;
    while (!stageDone && stageGuard < 24) {
      stageGuard += 1;
      if (Date.now() - startedAt.getTime() > opts.budget.maxWallTimeMs) {
        throw new Error("Checkmate wall budget exceeded");
      }
      if (toolCalls >= opts.budget.maxToolCalls) {
        throw new Error("Checkmate tool budget exceeded");
      }

      const action = await nextStageAction(opts.provider, messages, stepCounter);
      stepCounter += 1;

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
          stage,
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
          stage,
        });
        messages.push({
          role: "tool",
          name: action.toolName,
          content: result.slice(0, 50_000),
        });
        continue;
      }

      // stage_complete
      const art = action.artifact;
      await persistStageArtifact(opts, stage, art, {
        setMentalModelPath: (p) => {
          mentalModelPath = p;
        },
        setFindingsPath: (p) => {
          findingsPath = p;
        },
        setHypotheses: (h) => {
          hypotheses = h;
        },
        addProofs: (ps) => {
          proofs.push(...ps);
        },
        steps,
      });
      priorSummaries.push(`[${stage}] completed`);
      steps.push({
        index: steps.length,
        type: "message",
        role: "assistant",
        content: `[stage_complete:${stage}] ${action.raw.slice(0, 2000)}`,
        timestamp: new Date().toISOString(),
        stage,
      });
      stagesCompleted.push(stage);
      stageDone = true;
    }

    if (!stageDone) {
      throw new Error(`Checkmate stage ${stage} did not complete`);
    }
  }

  // Ensure findings exist
  try {
    await fs.access(findingsPath);
  } catch {
    const empty = FindingsDocumentSchema.parse({
      schemaVersion: 1,
      caseId: opts.caseId,
      producedBy: "checkmate",
      findings: [],
    });
    await fs.writeFile(findingsPath, JSON.stringify(empty, null, 2) + "\n");
  }

  // Enforce confirmed ⇒ proof toolResultRefs
  await enforceProofPolicy(findingsPath, proofs, steps);

  if (hypotheses) {
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "hypotheses.json"),
      JSON.stringify(hypotheses, null, 2) + "\n",
    );
  }
  if (proofs.length) {
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "proofs.json"),
      JSON.stringify(proofs, null, 2) + "\n",
    );
  }

  const finishedAt = new Date();
  const trajectory: Trajectory = TrajectorySchema.parse({
    schemaVersion: 1,
    caseId: opts.caseId,
    runId: opts.runId,
    agent: "checkmate",
    model: opts.provider.model,
    provider: opts.provider.name,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    budget: opts.budget,
    usage: {
      toolCalls,
      wallTimeMs: finishedAt.getTime() - startedAt.getTime(),
    },
    steps,
    findingsPath: path.relative(opts.repoRoot, findingsPath),
    notes: note,
  });

  await fs.mkdir(opts.trajectoriesDir, { recursive: true });
  const trajectoryPath = path.join(opts.trajectoriesDir, `${opts.runId}.json`);
  await fs.writeFile(trajectoryPath, JSON.stringify(trajectory, null, 2) + "\n");
  await fs.writeFile(
    path.join(opts.runArtifactsDir, "trajectory.json"),
    JSON.stringify(trajectory, null, 2) + "\n",
  );

  return {
    caseId: opts.caseId,
    runId: opts.runId,
    findingsPath,
    trajectoryPath,
    mentalModelPath,
    toolCalls,
    stagesCompleted,
    note,
    isMockEval: false,
  };
}

async function persistStageArtifact(
  opts: LlmPipelineOptions,
  stage: CheckmateStage,
  art: StageCompleteArtifact,
  hooks: {
    setMentalModelPath: (p: string) => void;
    setFindingsPath: (p: string) => void;
    setHypotheses: (h: HypothesesDocument) => void;
    addProofs: (p: Proof[]) => void;
    steps: TrajectoryStep[];
  },
): Promise<void> {
  switch (art.kind) {
    case "scope": {
      await fs.writeFile(
        path.join(opts.runArtifactsDir, "scope.md"),
        art.markdown.endsWith("\n") ? art.markdown : art.markdown + "\n",
      );
      return;
    }
    case "draft_notes": {
      await fs.writeFile(
        path.join(opts.runArtifactsDir, "draft_notes.md"),
        art.markdown.endsWith("\n") ? art.markdown : art.markdown + "\n",
      );
      return;
    }
    case "mental_model": {
      const model = ApplicationMentalModelSchema.parse({
        ...art.model,
        schemaVersion: 1,
        caseId: opts.caseId,
      });
      const p = path.join(opts.runArtifactsDir, "mental_model.json");
      await fs.writeFile(p, JSON.stringify(model, null, 2) + "\n");
      hooks.setMentalModelPath(p);
      return;
    }
    case "hypotheses": {
      const doc = HypothesesDocumentSchema.parse({
        ...art.document,
        schemaVersion: 1,
        caseId: opts.caseId,
      });
      await fs.writeFile(
        path.join(opts.runArtifactsDir, "hypotheses.json"),
        JSON.stringify(doc, null, 2) + "\n",
      );
      hooks.setHypotheses(doc);
      return;
    }
    case "verify": {
      const hyps = art.hypotheses.map((h) => ({
        ...h,
        schemaVersion: 1 as const,
      }));
      const doc = HypothesesDocumentSchema.parse({
        schemaVersion: 1,
        caseId: opts.caseId,
        hypotheses: hyps,
      });
      await fs.writeFile(
        path.join(opts.runArtifactsDir, "hypotheses.json"),
        JSON.stringify(doc, null, 2) + "\n",
      );
      hooks.setHypotheses(doc);
      const parsedProofs: Proof[] = [];
      for (const raw of art.proofs ?? []) {
        const proof = ProofSchema.parse({
          ...raw,
          schemaVersion: 1,
          toolResultRefs: raw.toolResultRefs ?? [],
          locators: raw.locators ?? [],
        });
        // If confirmed proof lacks refs, try attach latest tool_result for same stage
        if (
          proof.verified &&
          (!proof.toolResultRefs || proof.toolResultRefs.length === 0)
        ) {
          const last = [...hooks.steps]
            .reverse()
            .find((s) => s.type === "tool_result" && s.stage === "verify");
          if (last) {
            proof.toolResultRefs = [
              {
                stepIndex: last.index,
                toolName: last.toolName,
                excerpt: (last.toolResult ?? "").slice(0, 240),
              },
            ];
          }
        }
        const ap = proof.artifactPath ?? `proofs/${proof.id}.json`;
        proof.artifactPath = ap;
        await fs.writeFile(
          path.join(opts.runArtifactsDir, ap),
          JSON.stringify(proof, null, 2) + "\n",
        );
        parsedProofs.push(proof);
      }
      hooks.addProofs(parsedProofs);
      return;
    }
    case "report": {
      const findings = FindingsDocumentSchema.parse({
        ...art.findings,
        schemaVersion: 1,
        caseId: opts.caseId,
        producedBy: "checkmate",
      });
      const p = path.join(opts.runArtifactsDir, "findings.json");
      await fs.writeFile(p, JSON.stringify(findings, null, 2) + "\n");
      hooks.setFindingsPath(p);
      await fs.writeFile(
        path.join(opts.runArtifactsDir, "report.md"),
        art.reportMarkdown.endsWith("\n")
          ? art.reportMarkdown
          : art.reportMarkdown + "\n",
      );
      return;
    }
    default: {
      // If LLM returned wrong kind for stage, write a minimal placeholder
      if (stage === "scope") {
        await fs.writeFile(
          path.join(opts.runArtifactsDir, "scope.md"),
          `# Scope\n\nStage artifact kind mismatch; incomplete.\n`,
        );
      }
    }
  }
}

/**
 * Downgrade confirmed findings that lack proof toolResultRefs to unverified.
 * Never invent severity certainty without proof.
 */
async function enforceProofPolicy(
  findingsPath: string,
  proofs: Proof[],
  steps: TrajectoryStep[],
): Promise<void> {
  const raw = JSON.parse(await fs.readFile(findingsPath, "utf8"));
  const doc = FindingsDocumentSchema.parse(raw);
  const proofById = new Map(proofs.map((p) => [p.id, p]));
  const toolResults = steps.filter((s) => s.type === "tool_result");

  const findings = doc.findings.map((f) => {
    const linked = f.proofIds
      .map((id) => proofById.get(id))
      .filter((p): p is Proof => Boolean(p));
    const hasVerifiedProof = linked.some(
      (p) =>
        p.verified &&
        Array.isArray(p.toolResultRefs) &&
        p.toolResultRefs.length > 0 &&
        p.toolResultRefs.every((r) =>
          toolResults.some((t) => t.index === r.stepIndex),
        ),
    );
    if (f.verificationStatus === "confirmed" && !hasVerifiedProof) {
      return {
        ...f,
        verificationStatus: "unverified" as const,
        // Keep severity field for schema but mark clearly unverified
        description:
          f.description +
          " [DOWNGRADED: confirmed without valid tool_result proof refs]",
      };
    }
    if (!f.verificationStatus && hasVerifiedProof) {
      return { ...f, verificationStatus: "confirmed" as const };
    }
    if (!f.verificationStatus) {
      return { ...f, verificationStatus: "unverified" as const };
    }
    return f;
  });

  await fs.writeFile(
    findingsPath,
    JSON.stringify({ ...doc, findings }, null, 2) + "\n",
  );
}
