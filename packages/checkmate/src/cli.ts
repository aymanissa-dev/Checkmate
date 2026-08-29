#!/usr/bin/env node
import { getCheckmatePlan, runCheckmate } from "./index.js";

async function main(): Promise<void> {
  const plan = getCheckmatePlan();
  console.error(
    "evaluate:checkmate — STUB (Phase D+ not started)\n" +
      `Planned stages: ${plan.stages.join(" → ")}\n` +
      "Status: not_implemented\n" +
      "Use: pnpm evaluate:baseline -- --mock",
  );
  await runCheckmate({
    caseId: process.argv[2] ?? "unset",
    caseAppDir: ".",
    artifactsDir: "./artifacts",
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
