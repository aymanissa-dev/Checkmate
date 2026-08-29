/**
 * Deterministic mock Checkmate pipeline — exercises all stages with real sandbox tools.
 * Labels all outputs as harness smoke — NOT model performance.
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
  type Finding,
  type Hypothesis,
  type Proof,
  type Trajectory,
  type TrajectoryStep,
} from "@checkmate/schemas";
import { createCaseSandbox, type CaseSandbox } from "@checkmate/sandbox";
import { getCaseFixture } from "./fixture-map.js";
import {
  CHECKMATE_STAGES,
  CHECKMATE_SYSTEM_PREAMBLE,
  CRITICAL_DEFECT_VERIFICATION_SKILL,
} from "./prompts.js";

export interface MockPipelineOptions {
  caseId: string;
  caseAppDir: string;
  /** Absolute path: artifacts/<runId>/ */
  runArtifactsDir: string;
  trajectoriesDir: string;
  repoRoot: string;
  runId: string;
  budget: { maxToolCalls: number; maxWallTimeMs: number };
}

export interface MockPipelineResult {
  caseId: string;
  runId: string;
  findingsPath: string;
  trajectoryPath: string;
  mentalModelPath: string;
  toolCalls: number;
  stagesCompleted: CheckmateStage[];
  note: string;
  isMockEval: true;
}

async function invoke(
  sandbox: CaseSandbox,
  steps: TrajectoryStep[],
  stage: CheckmateStage,
  toolName: "list_files" | "read_file" | "search" | "run_command",
  toolArgs: Record<string, unknown>,
  assistantText: string,
): Promise<{ result: string; toolResultStepIndex: number }> {
  steps.push({
    index: steps.length,
    type: "tool_call",
    role: "assistant",
    toolName,
    toolArgs,
    content: assistantText,
    timestamp: new Date().toISOString(),
    stage,
  });
  let result: string;
  try {
    result = await sandbox.invokeTool(toolName, toolArgs);
  } catch (err) {
    result = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
  const toolResultStepIndex = steps.length;
  steps.push({
    index: toolResultStepIndex,
    type: "tool_result",
    role: "tool",
    toolName,
    toolResult: result.slice(0, 50_000),
    timestamp: new Date().toISOString(),
    stage,
  });
  return { result, toolResultStepIndex };
}

export async function runMockCheckmatePipeline(
  opts: MockPipelineOptions,
): Promise<MockPipelineResult> {
  const startedAt = new Date();
  const fixture = getCaseFixture(opts.caseId);
  const note =
    "MOCK/DRY-RUN Checkmate staged pipeline (harness smoke — NOT a real model evaluation)";

  const sandbox = createCaseSandbox({
    workspaceRoot: opts.caseAppDir,
    deniedPathFragments: ["truth.json"],
  });

  const steps: TrajectoryStep[] = [
    {
      index: 0,
      type: "message",
      role: "system",
      content: CHECKMATE_SYSTEM_PREAMBLE,
      timestamp: startedAt.toISOString(),
      stage: "scope",
    },
    {
      index: 1,
      type: "message",
      role: "user",
      content: `Case ID: ${opts.caseId}\nRun mock staged procedure. ${CRITICAL_DEFECT_VERIFICATION_SKILL}`,
      timestamp: startedAt.toISOString(),
      stage: "scope",
    },
  ];

  let toolCalls = 0;
  const stagesCompleted: CheckmateStage[] = [];

  await fs.mkdir(opts.runArtifactsDir, { recursive: true });
  await fs.mkdir(path.join(opts.runArtifactsDir, "proofs"), { recursive: true });

  // --- Stage 0: Scope ---
  {
    const stage: CheckmateStage = "scope";
    const { result } = await invoke(
      sandbox,
      steps,
      stage,
      "list_files",
      { path: "." },
      "[mock][scope] list workspace root",
    );
    toolCalls += 1;
    const scopeMd = `# Scope — ${opts.caseId}

## Application
${fixture.title}: ${fixture.summary}

## In scope
- Critical correctness / security / reliability defects in this workspace
- Sandbox tools only (list_files, read_file, search, run_command)

## Out of scope
- Product UI, GitHub App, multi-agent swarm
- Ground-truth / scorer files (not mounted)

## Workspace snapshot
\`\`\`
${result.slice(0, 2000)}
\`\`\`

_Mock dry-run — not a model evaluation._
`;
    await fs.writeFile(path.join(opts.runArtifactsDir, "scope.md"), scopeMd);
    steps.push({
      index: steps.length,
      type: "message",
      role: "assistant",
      content: "[mock][scope] wrote scope.md",
      timestamp: new Date().toISOString(),
      stage,
    });
    stagesCompleted.push(stage);
  }

  // --- Stage 1: Understand ---
  {
    const stage: CheckmateStage = "understand";
    await invoke(
      sandbox,
      steps,
      stage,
      "search",
      { pattern: fixture.searchPattern, path: "." },
      "[mock][understand] search risk patterns",
    );
    toolCalls += 1;

    const notesParts: string[] = [`# Draft notes — ${opts.caseId}\n`];
    for (const p of fixture.readPaths.slice(0, 3)) {
      const { result } = await invoke(
        sandbox,
        steps,
        stage,
        "read_file",
        { path: p },
        `[mock][understand] read ${p}`,
      );
      toolCalls += 1;
      notesParts.push(`## ${p}\n\n\`\`\`\n${result.slice(0, 1500)}\n\`\`\`\n`);
    }
    notesParts.push(
      `\n## Risk areas (draft)\n- ${fixture.hypothesis.claim}\n\n_Mock dry-run — not a model evaluation._\n`,
    );
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "draft_notes.md"),
      notesParts.join("\n"),
    );
    stagesCompleted.push(stage);
  }

  // --- Stage 2: Model ---
  {
    const stage: CheckmateStage = "model";
    await invoke(
      sandbox,
      steps,
      stage,
      "list_files",
      { path: "src" },
      "[mock][model] list src/",
    );
    toolCalls += 1;

    const mentalModel: ApplicationMentalModel =
      ApplicationMentalModelSchema.parse({
        schemaVersion: 1,
        caseId: opts.caseId,
        summary: fixture.summary,
        components: fixture.components,
        trustBoundaries: fixture.trustBoundaries,
        dataStores: fixture.dataStores,
        entryPoints: fixture.entryPoints,
        assumptions: [
          "Agent sees only cases/<id>/app workspace",
          "Mock pipeline uses fixture map for hypothesized defect class (harness only)",
        ],
        openQuestions: [
          "Can the smallest sandbox check confirm the primary risk claim?",
        ],
      });
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "mental_model.json"),
      JSON.stringify(mentalModel, null, 2) + "\n",
    );
    steps.push({
      index: steps.length,
      type: "message",
      role: "assistant",
      content: "[mock][model] wrote mental_model.json",
      timestamp: new Date().toISOString(),
      stage,
    });
    stagesCompleted.push(stage);
  }

  // --- Stage 3: Hypothesize ---
  {
    const stage: CheckmateStage = "hypothesize";
    const hypotheses: Hypothesis[] = [
      {
        schemaVersion: 1,
        ...fixture.hypothesis,
        status: "proposed",
        proofIds: [],
      },
    ];
    const doc = HypothesesDocumentSchema.parse({
      schemaVersion: 1,
      caseId: opts.caseId,
      hypotheses,
    });
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "hypotheses.json"),
      JSON.stringify(doc, null, 2) + "\n",
    );
    steps.push({
      index: steps.length,
      type: "message",
      role: "assistant",
      content: "[mock][hypothesize] wrote hypotheses.json (proposed)",
      timestamp: new Date().toISOString(),
      stage,
    });
    stagesCompleted.push(stage);
  }

  // --- Stage 4: Verify ---
  let proofs: Proof[] = [];
  let confirmedHypothesis: Hypothesis;
  {
    const stage: CheckmateStage = "verify";
    const primaryPath =
      fixture.finding.locators[0]?.path ?? fixture.readPaths[0] ?? "package.json";

    const { result, toolResultStepIndex } = await invoke(
      sandbox,
      steps,
      stage,
      "read_file",
      { path: primaryPath },
      `[mock][verify] re-read ${primaryPath} for proof`,
    );
    toolCalls += 1;

    // Smallest extra check: search for a match key token in code
    const key = fixture.finding.matchKeys[0] ?? "error";
    const searchRes = await invoke(
      sandbox,
      steps,
      stage,
      "search",
      { pattern: key, path: "." },
      `[mock][verify] search evidence for "${key}"`,
    );
    toolCalls += 1;

    const findingId = fixture.finding.id;
    const proofId = "P1";
    const excerpt = result.slice(0, 800);
    const proof = ProofSchema.parse({
      schemaVersion: 1,
      id: proofId,
      findingId,
      kind: "code-citation",
      summary: `Sandbox read of ${primaryPath} supports hypothesis ${fixture.hypothesis.id}`,
      details: `Verify stage used read_file + search. Mock labels this as harness confirmation for fixture defect class — NOT a live model judgment.`,
      locators: fixture.finding.locators,
      stdoutExcerpt: excerpt,
      verified: true,
      toolResultRefs: [
        {
          stepIndex: toolResultStepIndex,
          toolName: "read_file",
          excerpt: excerpt.slice(0, 240),
        },
        {
          stepIndex: searchRes.toolResultStepIndex,
          toolName: "search",
          excerpt: searchRes.result.slice(0, 240),
        },
      ],
      artifactPath: `proofs/${proofId}.json`,
    });
    proofs = [proof];
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "proofs", `${proofId}.json`),
      JSON.stringify(proof, null, 2) + "\n",
    );

    confirmedHypothesis = {
      schemaVersion: 1,
      ...fixture.hypothesis,
      status: "confirmed",
      proofIds: [proofId],
      notes: "Confirmed in mock pipeline via sandbox tool_result refs",
    };
    const hypDoc = HypothesesDocumentSchema.parse({
      schemaVersion: 1,
      caseId: opts.caseId,
      hypotheses: [confirmedHypothesis],
    });
    await fs.writeFile(
      path.join(opts.runArtifactsDir, "hypotheses.json"),
      JSON.stringify(hypDoc, null, 2) + "\n",
    );
    stagesCompleted.push(stage);
  }

  // --- Stage 5: Report ---
  {
    const stage: CheckmateStage = "report";
    const finding: Finding = {
      schemaVersion: 1,
      ...fixture.finding,
      proofIds: proofs.map((p) => p.id),
      verificationStatus: "confirmed",
      confidence: 0.9,
    };
    const findingsDoc = FindingsDocumentSchema.parse({
      schemaVersion: 1,
      caseId: opts.caseId,
      producedBy: "checkmate",
      findings: [finding],
    });
    // Mock still uses producedBy checkmate but notes clarify fixture nature;
    // trajectory agent will be "fixture" when isMock.
    const findingsPath = path.join(opts.runArtifactsDir, "findings.json");
    await fs.writeFile(
      findingsPath,
      JSON.stringify(findingsDoc, null, 2) + "\n",
    );

    const reportMd = `# Checkmate report — ${opts.caseId}

## Mode
**MOCK / DRY-RUN** — harness smoke only. Scores from this run are **not** model performance.

## Stages completed
${CHECKMATE_STAGES.map((s) => `- ${s}${stagesCompleted.includes(s) ? " ✓" : ""}`).join("\n")}

## Mental model
See \`mental_model.json\`.

## Hypotheses
- ${confirmedHypothesis!.id}: ${confirmedHypothesis!.claim} → **${confirmedHypothesis!.status}**

## Confirmed findings
- ${finding.id}: ${finding.title} (${finding.severity})
  - Proofs: ${finding.proofIds.join(", ")}
  - verificationStatus: ${finding.verificationStatus}

## Unverified
None in mock fixture path.

## Budget
toolCalls≈${toolCalls} / max ${opts.budget.maxToolCalls}
`;
    await fs.writeFile(path.join(opts.runArtifactsDir, "report.md"), reportMd);
    steps.push({
      index: steps.length,
      type: "final",
      role: "assistant",
      content: "[mock][report] wrote findings.json + report.md",
      timestamp: new Date().toISOString(),
      stage,
    });
    stagesCompleted.push(stage);
  }

  const finishedAt = new Date();
  if (toolCalls > opts.budget.maxToolCalls) {
    throw new Error(
      `Mock Checkmate exceeded tool budget: ${toolCalls} > ${opts.budget.maxToolCalls}`,
    );
  }
  const wall = finishedAt.getTime() - startedAt.getTime();
  if (wall > opts.budget.maxWallTimeMs) {
    throw new Error(
      `Mock Checkmate exceeded wall budget: ${wall}ms > ${opts.budget.maxWallTimeMs}`,
    );
  }

  const findingsPath = path.join(opts.runArtifactsDir, "findings.json");
  const mentalModelPath = path.join(opts.runArtifactsDir, "mental_model.json");

  const trajectory: Trajectory = TrajectorySchema.parse({
    schemaVersion: 1,
    caseId: opts.caseId,
    runId: opts.runId,
    agent: "fixture",
    model: "checkmate-mock-pipeline-v1",
    provider: "mock",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    budget: opts.budget,
    usage: { toolCalls, wallTimeMs: wall },
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

  // Persist proofs index
  await fs.writeFile(
    path.join(opts.runArtifactsDir, "proofs.json"),
    JSON.stringify(proofs, null, 2) + "\n",
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
    isMockEval: true,
  };
}
