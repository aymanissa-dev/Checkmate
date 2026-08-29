#!/usr/bin/env node
/**
 * Guard: agent-visible paths must not contain ground-truth leak patterns.
 * Fails if trajectories/, artifacts findings, or case app/ trees reference truth.json
 * contents or scorer-only paths in a leaking way.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LEAK_PATTERNS = [
  /truth\.json/i,
  /groundTruthDefect/i,
  /GroundTruthDefect/i,
  /scorer-only/i,
  /cases\/[^/]+\/truth/i,
];

/** Paths that MAY mention truth (docs, eval, scripts, schemas). */
function isAllowedPath(rel) {
  if (rel.startsWith("docs/")) return true;
  if (rel.startsWith("scripts/")) return true;
  if (rel.startsWith("packages/eval/")) return true;
  if (rel.startsWith("packages/schemas/")) return true;
  if (rel.startsWith("packages/baseline/") && /runner|cli|mock/.test(rel)) {
    // baseline may mention denial of truth.json in sandbox config — allow explicit deny strings
    return true;
  }
  if (rel.startsWith("packages/sandbox/")) return true;
  if (rel === "README.md" || rel === "ARCHITECTURE.md" || rel === "REPRODUCTION.md") {
    return true;
  }
  if (rel === "IMPROVEMENT_CHANGELOG.md") return true;
  if (/\/CASE\.md$/.test(rel)) return true;
  if (/\/truth\.json$/.test(rel)) return true; // the file itself
  if (/\/fixtures\//.test(rel)) return true;
  return false;
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist") {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  const targets = [
    path.join(root, "trajectories"),
    path.join(root, "artifacts"),
    path.join(root, "cases"),
    path.join(root, "packages", "baseline"),
    path.join(root, "packages", "checkmate"),
  ];

  const violations = [];

  for (const target of targets) {
    try {
      await fs.access(target);
    } catch {
      continue;
    }
    const files = await walk(target);
    for (const file of files) {
      const rel = path.relative(root, file);
      if (isAllowedPath(rel)) continue;
      // Only scan text-ish
      if (!/\.(json|md|js|ts|mjs|cjs|txt|yml|yaml)$/i.test(file)) continue;
      // Never scan truth.json content against itself as a leak in agent apps
      if (rel.includes(`${path.sep}app${path.sep}`) || rel.startsWith("trajectories/") || rel.startsWith("artifacts/")) {
        let text = "";
        try {
          text = await fs.readFile(file, "utf8");
        } catch {
          continue;
        }
        for (const re of LEAK_PATTERNS) {
          if (re.test(text)) {
            // Allow sandbox deny list mentioning truth.json in packages — already filtered
            // Allow artifacts/score.json mentioning defect ids — scores are scorer output, OK
            if (rel.endsWith("score.json")) continue;
            violations.push({ file: rel, pattern: String(re) });
          }
        }
      }
    }
  }

  // Structural check: truth.json must sit beside app/, not inside app/
  const casesDir = path.join(root, "cases");
  const caseEntries = await fs.readdir(casesDir, { withFileTypes: true });
  for (const ent of caseEntries) {
    if (!ent.isDirectory()) continue;
    const insideApp = path.join(casesDir, ent.name, "app", "truth.json");
    try {
      await fs.access(insideApp);
      violations.push({
        file: path.relative(root, insideApp),
        pattern: "truth.json_inside_app",
      });
    } catch {
      /* good */
    }
  }

  if (violations.length) {
    console.error("Truth isolation guard FAILED:");
    for (const v of violations) {
      console.error(`  - ${v.file} matches ${v.pattern}`);
    }
    process.exit(1);
  }
  console.log("Truth isolation guard PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
