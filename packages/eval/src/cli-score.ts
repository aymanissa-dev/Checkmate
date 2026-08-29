#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreCaseDir } from "./index.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const caseId = args[0];
  const findingsArg = args[1];

  if (!caseId) {
    console.error(
      "Usage: evaluate:score <caseId> [findings.json]\n" +
        "  Default findings path: artifacts/<caseId>/findings.json\n" +
        "  Or fixtures: cases/<caseId>/fixtures/sample-findings.json",
    );
    process.exit(2);
  }

  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  );
  const caseDir = path.join(root, "cases", caseId);
  const findingsPath =
    findingsArg ??
    (await resolveFindings(root, caseId));

  const report = await scoreCaseDir(caseDir, findingsPath);
  const outDir = path.join(root, "artifacts", caseId);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "score.json");
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

async function resolveFindings(root: string, caseId: string): Promise<string> {
  const candidates = [
    path.join(root, "artifacts", caseId, "findings.json"),
    path.join(root, "cases", caseId, "fixtures", "sample-findings.json"),
  ];
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {
      /* continue */
    }
  }
  throw new Error(
    `No findings.json found for ${caseId}. Provide a path or run baseline first.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
