#!/usr/bin/env node
/**
 * Phase E lite: run baseline + checkmate (default mock) and print a comparison table.
 * Mock scores are harness smoke only — NEVER report as model performance.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBaseline } from "../packages/baseline/src/index.ts";
import { runCheckmate } from "../packages/checkmate/src/index.ts";
import {
  scoreCaseDir,
  type ScoreReport,
} from "../packages/eval/src/index.ts";

interface Row {
  caseId: string;
  baseline: ScoreReport | null;
  checkmate: ScoreReport | null;
  baselineMock: boolean;
  checkmateMock: boolean;
  error?: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  // Default mock for CI / no-key environments. --live opts into real providers.
  const useMock =
    !live ||
    args.includes("--mock") ||
    args.includes("--dry-run") ||
    process.env.CHECKMATE_DRY_RUN === "1" ||
    process.env.CHECKMATE_MODEL_PROVIDER === "mock";

  const caseFilter = args.find((a) => !a.startsWith("-"));
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const casesRoot = path.join(root, "cases");
  const entries = await fs.readdir(casesRoot, { withFileTypes: true });
  const caseIds = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((id) => !caseFilter || id === caseFilter || id.startsWith(caseFilter))
    .sort();

  console.log(
    useMock
      ? "=== evaluate (baseline + checkmate + compare) MOCK/DRY-RUN ===\n" +
          "Scores below are HARNESS SMOKE ONLY — not real model metrics.\n"
      : "=== evaluate (baseline + checkmate + compare) LIVE ===\n",
  );

  const rows: Row[] = [];

  for (const caseId of caseIds) {
    const caseDir = path.join(casesRoot, caseId);
    const appDir = path.join(caseDir, "app");
    try {
      await fs.access(appDir);
    } catch {
      continue;
    }

    const artifactsRoot = path.join(root, "artifacts");
    const caseArtifactsDir = path.join(artifactsRoot, caseId);
    const trajectoriesDir = path.join(root, "trajectories");
    await fs.mkdir(caseArtifactsDir, { recursive: true });

    try {
      const baseline = await runBaseline({
        caseId,
        caseAppDir: appDir,
        artifactsDir: caseArtifactsDir,
        trajectoriesDir,
        repoRoot: root,
        forceMock: useMock,
      });
      await fs.copyFile(
        baseline.findingsPath,
        path.join(caseArtifactsDir, "baseline-findings.json"),
      );

      const checkmate = await runCheckmate({
        caseId,
        caseAppDir: appDir,
        artifactsRoot,
        caseArtifactsDir,
        trajectoriesDir,
        repoRoot: root,
        forceMock: useMock,
      });

      const bScore = await scoreCaseDir(caseDir, baseline.findingsPath);
      const cScore = await scoreCaseDir(caseDir, checkmate.findingsPath);
      await fs.writeFile(
        path.join(caseArtifactsDir, "score.json"),
        JSON.stringify(bScore, null, 2) + "\n",
      );
      await fs.writeFile(
        path.join(caseArtifactsDir, "checkmate-score.json"),
        JSON.stringify(cScore, null, 2) + "\n",
      );

      rows.push({
        caseId,
        baseline: bScore,
        checkmate: cScore,
        baselineMock: baseline.isMockEval,
        checkmateMock: checkmate.isMockEval,
      });
    } catch (err) {
      rows.push({
        caseId,
        baseline: null,
        checkmate: null,
        baselineMock: useMock,
        checkmateMock: useMock,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const header = [
    "caseId".padEnd(24),
    "b_TP",
    "b_FN",
    "b_rec",
    "c_TP",
    "c_FN",
    "c_rec",
    "delta_rec",
    "label",
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const row of rows) {
    if (row.error) {
      console.log(`${row.caseId.padEnd(24)}  ERROR: ${row.error}`);
      continue;
    }
    const b = row.baseline!;
    const c = row.checkmate!;
    const delta = c.recall - b.recall;
    const label =
      row.baselineMock || row.checkmateMock ? "MOCK-SMOKE" : "LIVE";
    console.log(
      [
        row.caseId.padEnd(24),
        String(b.truePositives).padStart(4),
        String(b.falseNegatives).padStart(4),
        b.recall.toFixed(2).padStart(5),
        String(c.truePositives).padStart(4),
        String(c.falseNegatives).padStart(4),
        c.recall.toFixed(2).padStart(5),
        ((delta >= 0 ? "+" : "") + delta.toFixed(2)).padStart(9),
        label,
      ].join("  "),
    );
  }

  const outPath = path.join(root, "artifacts", "comparison-table.json");
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: useMock ? "mock" : "live",
        disclaimer: useMock
          ? "MOCK harness smoke — not real model evaluation metrics"
          : "Live run — interpret with care; document incomplete cases separately",
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${outPath}`);
  if (useMock) {
    console.log(
      "\nNOTE: All scores labeled MOCK-SMOKE. Do not cite as CDR / model improvements.",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
