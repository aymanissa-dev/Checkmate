#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBaseline } from "./runner.js";
import { scoreCaseDir } from "@checkmate/eval";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const forceMock =
    args.includes("--mock") ||
    args.includes("--dry-run") ||
    process.env.CHECKMATE_DRY_RUN === "1" ||
    process.env.CHECKMATE_MODEL_PROVIDER === "mock";

  const caseFilter = args.find((a) => !a.startsWith("-"));
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  );
  const casesRoot = path.join(root, "cases");
  const entries = await fs.readdir(casesRoot, { withFileTypes: true });
  const caseIds = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((id) => !caseFilter || id === caseFilter || id.startsWith(caseFilter))
    .sort();

  if (caseIds.length === 0) {
    console.error("No cases found matching filter:", caseFilter ?? "(all)");
    process.exit(1);
  }

  console.log(
    forceMock
      ? "Running baseline in MOCK/DRY-RUN mode (harness smoke — NOT a real model eval)\n"
      : "Running baseline (will use API key if present, else mock)\n",
  );

  for (const caseId of caseIds) {
    const caseDir = path.join(casesRoot, caseId);
    const appDir = path.join(caseDir, "app");
    try {
      await fs.access(appDir);
    } catch {
      console.log(`SKIP ${caseId}: no app/ directory yet`);
      continue;
    }

    const artifactsDir = path.join(root, "artifacts", caseId);
    const trajectoriesDir = path.join(root, "trajectories");

    const result = await runBaseline({
      caseId,
      caseAppDir: appDir,
      artifactsDir,
      trajectoriesDir,
      repoRoot: root,
      forceMock,
    });

    console.log(`=== ${caseId} ===`);
    console.log(`  mode: ${result.mode}${result.isMockEval ? " (mock)" : ""}`);
    console.log(`  toolCalls: ${result.toolCalls}`);
    console.log(`  findings: ${result.findingsPath}`);
    console.log(`  trajectory: ${result.trajectoryPath}`);
    console.log(`  note: ${result.note}`);

    try {
      const score = await scoreCaseDir(caseDir, result.findingsPath);
      const scorePath = path.join(artifactsDir, "score.json");
      await fs.writeFile(scorePath, JSON.stringify(score, null, 2) + "\n");
      console.log(
        `  score: TP=${score.truePositives} FN=${score.falseNegatives} FP=${score.falsePositives} recall=${score.recall.toFixed(2)}` +
          (result.isMockEval
            ? " [MOCK FIXTURE SCORE — not model performance]"
            : ""),
      );
    } catch (err) {
      console.log(
        `  score: incomplete (${err instanceof Error ? err.message : err})`,
      );
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
