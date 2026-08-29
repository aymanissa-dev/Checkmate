#!/usr/bin/env node
/**
 * Smoke: run each case app's happy-path smoke script where present.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd: string, cwd: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("/bin/bash", ["-lc", cmd], { cwd });
    let out = "";
    child.stdout.on("data", (b) => (out += b.toString()));
    child.stderr.on("data", (b) => (out += b.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

async function main() {
  const casesRoot = path.join(root, "cases");
  const entries = (await fs.readdir(casesRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let failed = 0;
  for (const id of entries) {
    const appDir = path.join(casesRoot, id, "app");
    const pkgPath = path.join(appDir, "package.json");
    try {
      await fs.access(pkgPath);
    } catch {
      console.log(`SKIP ${id}: no app/package.json`);
      continue;
    }
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    if (!pkg.scripts?.smoke) {
      console.log(`SKIP ${id}: no smoke script`);
      continue;
    }
    const { code, out } = await run("npm run smoke", appDir);
    if (code === 0) {
      console.log(`OK   ${id}`);
    } else {
      failed += 1;
      console.log(`FAIL ${id}\n${out}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} smoke failure(s)`);
    process.exit(1);
  }
  console.log("\nAll case smokes passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
