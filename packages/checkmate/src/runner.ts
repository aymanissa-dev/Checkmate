import fs from "node:fs/promises";
import path from "node:path";
import { resolveProvider, type ModelProvider } from "@checkmate/baseline";
import type { CheckmateStage } from "@checkmate/schemas";
import { CHECKMATE_STAGES, getCheckmatePlan } from "./plan.js";
import { runMockCheckmatePipeline } from "./mock-pipeline.js";
import { runLlmCheckmatePipeline } from "./llm-pipeline.js";

export interface CheckmateBudget {
  maxToolCalls: number;
  maxWallTimeMs: number;
}

/** Comparable to baseline (40 / 180s) with modest headroom for staged verify. */
export const DEFAULT_CHECKMATE_BUDGET: CheckmateBudget = {
  maxToolCalls: 48,
  maxWallTimeMs: 240_000,
};

export interface CheckmateRunOptions {
  caseId: string;
  caseAppDir: string;
  /** Parent artifacts dir (repo artifacts/). Run writes under artifacts/<runId>/. */
  artifactsRoot: string;
  /** Convenience: also mirror findings under artifacts/<caseId>/ */
  caseArtifactsDir?: string;
  trajectoriesDir: string;
  repoRoot: string;
  budget?: Partial<CheckmateBudget>;
  provider?: ModelProvider;
  forceMock?: boolean;
}

export interface CheckmateRunResult {
  caseId: string;
  runId: string;
  mode: string;
  findingsPath: string;
  trajectoryPath: string;
  mentalModelPath: string;
  runArtifactsDir: string;
  toolCalls: number;
  stagesCompleted: CheckmateStage[];
  note: string;
  isMockEval: boolean;
}

export async function runCheckmate(
  opts: CheckmateRunOptions,
): Promise<CheckmateRunResult> {
  const budget: CheckmateBudget = {
    ...DEFAULT_CHECKMATE_BUDGET,
    ...opts.budget,
  };
  const runId = `checkmate-${opts.caseId}-${Date.now()}`;
  const runArtifactsDir = path.join(opts.artifactsRoot, runId);

  const resolved =
    opts.provider
      ? {
          provider: opts.provider,
          mode: opts.provider.name,
          note: "Custom provider",
          isMock: opts.provider.name === "mock",
        }
      : resolveProvider(opts.caseId, opts.forceMock);

  let result: {
    caseId: string;
    runId: string;
    findingsPath: string;
    trajectoryPath: string;
    mentalModelPath: string;
    toolCalls: number;
    stagesCompleted: CheckmateStage[];
    note: string;
    isMockEval: boolean;
  };

  if (resolved.isMock || opts.forceMock) {
    result = await runMockCheckmatePipeline({
      caseId: opts.caseId,
      caseAppDir: opts.caseAppDir,
      runArtifactsDir,
      trajectoriesDir: opts.trajectoriesDir,
      repoRoot: opts.repoRoot,
      runId,
      budget,
    });
  } else {
    result = await runLlmCheckmatePipeline({
      caseId: opts.caseId,
      caseAppDir: opts.caseAppDir,
      runArtifactsDir,
      trajectoriesDir: opts.trajectoriesDir,
      repoRoot: opts.repoRoot,
      runId,
      budget,
      provider: resolved.provider,
    });
  }

  // Mirror latest findings for scoring convenience
  const caseDir =
    opts.caseArtifactsDir ?? path.join(opts.artifactsRoot, opts.caseId);
  await fs.mkdir(caseDir, { recursive: true });
  const mirrorFindings = path.join(caseDir, "checkmate-findings.json");
  await fs.copyFile(result.findingsPath, mirrorFindings);
  await fs.writeFile(
    path.join(caseDir, "checkmate-latest.json"),
    JSON.stringify(
      {
        runId: result.runId,
        runArtifactsDir: path.relative(opts.repoRoot, runArtifactsDir),
        findingsPath: path.relative(opts.repoRoot, result.findingsPath),
        mentalModelPath: path.relative(opts.repoRoot, result.mentalModelPath),
        trajectoryPath: path.relative(opts.repoRoot, result.trajectoryPath),
        isMockEval: result.isMockEval,
        stagesCompleted: result.stagesCompleted,
        note: result.note,
      },
      null,
      2,
    ) + "\n",
  );

  // Also copy mental_model to case dir for gate checks
  await fs.copyFile(
    result.mentalModelPath,
    path.join(caseDir, "mental_model.json"),
  );

  return {
    ...result,
    mode: resolved.mode,
    runArtifactsDir,
    note: result.isMockEval
      ? result.note
      : `${result.note}; ${resolved.note}`,
  };
}

export { CHECKMATE_STAGES, getCheckmatePlan };
