#!/usr/bin/env node
/**
 * Gate A fixture test: score hand-written sample findings without LLM.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreCaseDir } from "../packages/eval/src/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const fixtureCases = ["01-auth-idor", "02-jwt-alg-none"];
  for (const caseId of fixtureCases) {
    const caseDir = path.join(root, "cases", caseId);
    const findings = path.join(caseDir, "fixtures", "sample-findings.json");
    const report = await scoreCaseDir(caseDir, findings);
    console.log(
      `${caseId}: TP=${report.truePositives} FN=${report.falseNegatives} recall=${report.recall}`,
    );
    if (report.truePositives < 1 || report.falseNegatives > 0) {
      throw new Error(`Fixture score failed for ${caseId}`);
    }
    await fs.mkdir(path.join(root, "artifacts", caseId), { recursive: true });
    await fs.writeFile(
      path.join(root, "artifacts", caseId, "fixture-score.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  console.log("Gate A fixture scoring PASSED (≥2 cases, no LLM)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
