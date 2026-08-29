#!/usr/bin/env node
/**
 * Phase E: run baseline + checkmate and emit judge-ready comparison reports.
 *
 * Default: mock/dry-run (CI / no keys). Mock scores are HARNESS SMOKE ONLY.
 * --live: real providers when the selected (or default HF) provider has a key.
 * Default provider is Hugging Face; OpenAI only if CHECKMATE_MODEL_PROVIDER=openai.
 * If --live but keys absent → SKIPPED (no fabricated metrics).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runBaseline,
  getHfToken,
  isHuggingFaceProviderName,
  DEFAULT_HF_MODEL,
} from "../packages/baseline/src/index.ts";
import { runCheckmate } from "../packages/checkmate/src/index.ts";
import {
  MATCH_POLICY,
  MATCH_POLICY_ID,
  RESOURCE_PARITY,
  scoreCaseDir,
  type ScoreReport,
} from "../packages/eval/src/index.ts";

type RunLabel = "MOCK-SMOKE" | "LIVE" | "SKIPPED-NO-KEY" | "ERROR";

interface Row {
  caseId: string;
  baseline: ScoreReport | null;
  checkmate: ScoreReport | null;
  baselineMock: boolean;
  checkmateMock: boolean;
  label: RunLabel;
  baselineRunId?: string;
  checkmateRunId?: string;
  mentalModelPath?: string;
  error?: string;
}

interface ComparisonReport {
  schemaVersion: 1;
  generatedAt: string;
  mode: "mock" | "live" | "skipped-no-key";
  label: RunLabel;
  disclaimer: string;
  liveEvalStatus: "ran" | "skipped-no-key" | "mock-only";
  matchPolicy: typeof MATCH_POLICY;
  resourceParity: typeof RESOURCE_PARITY;
  model: {
    requested: string;
    providerEnv: string | undefined;
    openaiKeyPresent: boolean;
    huggingfaceKeyPresent: boolean;
    anthropicKeyPresent: boolean;
  };
  aggregates: {
    casesAttempted: number;
    casesScored: number;
    casesErrored: number;
    baseline: {
      truePositives: number | null;
      falseNegatives: number | null;
      falsePositives: number | null;
      meanRecall: number | null;
      meanPrecision: number | null;
    };
    checkmate: {
      truePositives: number | null;
      falseNegatives: number | null;
      falsePositives: number | null;
      meanRecall: number | null;
      meanPrecision: number | null;
    };
    /** null when not a live measured run — never invent CDR. */
    deltaMeanRecall: number | null;
    metricsAreLive: boolean;
  };
  livePlaceholders: {
    note: string;
    criticalDefectRecall_baseline: null;
    criticalDefectRecall_checkmate: null;
    precision_baseline: null;
    precision_checkmate: null;
    costEstimateUsd: null;
    wallTimeTotalMs: null;
  };
  rows: Row[];
  sampleTrajectories: string[];
  viewerHint: string;
}

function selectedProvider(): string {
  return (process.env.CHECKMATE_MODEL_PROVIDER ?? "").toLowerCase();
}

/** Effective provider: unset → huggingface (OpenAI is opt-in only). */
function effectiveProvider(): string {
  const explicit = selectedProvider();
  if (explicit) return explicit;
  return RESOURCE_PARITY.defaultProvider;
}

/** Whether a live key exists for the *selected* (or default HF) provider. */
function hasLiveKey(): boolean {
  const provider = effectiveProvider();
  if (provider === "openai") {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }
  if (isHuggingFaceProviderName(provider)) {
    return Boolean(getHfToken());
  }
  if (provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }
  if (provider === "mock") return false;
  // Unknown → treat as default HF requirement
  return Boolean(getHfToken());
}

function missingKeyHint(): string {
  const provider = effectiveProvider();
  if (isHuggingFaceProviderName(provider)) {
    return "HF_TOKEN or HUGGINGFACE_API_KEY";
  }
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  return "HF_TOKEN or HUGGINGFACE_API_KEY";
}

function requestedModel(): string {
  if (process.env.CHECKMATE_MODEL?.trim()) {
    return process.env.CHECKMATE_MODEL.trim();
  }
  const provider = effectiveProvider();
  if (provider === "openai") {
    return RESOURCE_PARITY.defaultOpenaiModel;
  }
  if (isHuggingFaceProviderName(provider)) {
    return DEFAULT_HF_MODEL;
  }
  return RESOURCE_PARITY.defaultModel;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0);
}

function buildMarkdown(report: ComparisonReport): string {
  const lines: string[] = [];
  lines.push("# Checkmate comparison report");
  lines.push("");
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Mode:** \`${report.mode}\``);
  lines.push(`- **Label:** **${report.label}**`);
  lines.push(`- **Live eval status:** ${report.liveEvalStatus}`);
  lines.push(`- **Match policy:** \`${report.matchPolicy.id}\` (frozen)`);
  lines.push(`- **Disclaimer:** ${report.disclaimer}`);
  lines.push("");
  lines.push("## Resource parity");
  lines.push("");
  lines.push(
    `| Side | maxToolCalls | maxWallTimeMs | tools |`,
  );
  lines.push(`|---|---:|---:|---|`);
  lines.push(
    `| Baseline | ${report.resourceParity.baselineBudget.maxToolCalls} | ${report.resourceParity.baselineBudget.maxWallTimeMs} | ${report.resourceParity.sameToolSurface.join(", ")} |`,
  );
  lines.push(
    `| Checkmate | ${report.resourceParity.checkmateBudget.maxToolCalls} | ${report.resourceParity.checkmateBudget.maxWallTimeMs} | same |`,
  );
  lines.push("");
  lines.push(
    `Default model (live): \`${report.model.requested}\` via \`CHECKMATE_MODEL\` / provider (default \`huggingface\`; OpenAI opt-in). Requested this run: \`${report.model.requested}\`.`,
  );
  lines.push("");
  for (const d of report.resourceParity.differencesExplained) {
    lines.push(`- ${d}`);
  }
  lines.push("");
  lines.push("## Aggregates");
  lines.push("");
  if (!report.aggregates.metricsAreLive) {
    lines.push(
      "> **Metrics below are NOT live model CDR.** Placeholders / mock-smoke only.",
    );
    lines.push("");
  }
  const a = report.aggregates;
  lines.push("| Metric | Baseline | Checkmate | Delta |");
  lines.push("|---|---:|---:|---:|");
  const fmt = (n: number | null) =>
    n === null ? "—" : typeof n === "number" && n % 1 !== 0 ? n.toFixed(3) : String(n);
  const dRec =
    a.deltaMeanRecall === null
      ? "—"
      : `${a.deltaMeanRecall >= 0 ? "+" : ""}${a.deltaMeanRecall.toFixed(3)}`;
  lines.push(
    `| Mean recall | ${fmt(a.baseline.meanRecall)} | ${fmt(a.checkmate.meanRecall)} | ${dRec} |`,
  );
  lines.push(
    `| Mean precision | ${fmt(a.baseline.meanPrecision)} | ${fmt(a.checkmate.meanPrecision)} | — |`,
  );
  lines.push(
    `| TP (sum) | ${fmt(a.baseline.truePositives)} | ${fmt(a.checkmate.truePositives)} | — |`,
  );
  lines.push(
    `| FN (sum) | ${fmt(a.baseline.falseNegatives)} | ${fmt(a.checkmate.falseNegatives)} | — |`,
  );
  lines.push(
    `| FP (sum) | ${fmt(a.baseline.falsePositives)} | ${fmt(a.checkmate.falsePositives)} | — |`,
  );
  lines.push(
    `| Cases scored | ${a.casesScored} / ${a.casesAttempted} | | errors: ${a.casesErrored} |`,
  );
  lines.push("");
  lines.push("## Live metric placeholders");
  lines.push("");
  lines.push(
    "Filled only after a keyed live run. Until then these stay `null` — never invent numbers.",
  );
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(report.livePlaceholders, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Per-case table");
  lines.push("");
  lines.push(
    "| caseId | b_TP | b_FN | b_rec | b_prec | c_TP | c_FN | c_rec | c_prec | Δrec | label |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const row of report.rows) {
    if (row.error || !row.baseline || !row.checkmate) {
      lines.push(
        `| ${row.caseId} | — | — | — | — | — | — | — | — | — | ${row.label}${row.error ? ` (${row.error})` : ""} |`,
      );
      continue;
    }
    const b = row.baseline;
    const c = row.checkmate;
    const delta = c.recall - b.recall;
    const bp = b.precision === null ? "—" : b.precision.toFixed(2);
    const cp = c.precision === null ? "—" : c.precision.toFixed(2);
    lines.push(
      `| ${row.caseId} | ${b.truePositives} | ${b.falseNegatives} | ${b.recall.toFixed(2)} | ${bp} | ${c.truePositives} | ${c.falseNegatives} | ${c.recall.toFixed(2)} | ${cp} | ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} | ${row.label} |`,
    );
  }
  lines.push("");
  lines.push("## Sample trajectories (submission)");
  lines.push("");
  for (const t of report.sampleTrajectories) {
    lines.push(`- \`${t}\``);
  }
  lines.push("");
  lines.push("## Viewer");
  lines.push("");
  lines.push(report.viewerHint);
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantLive = args.includes("--live");
  const forceMockFlag =
    args.includes("--mock") ||
    args.includes("--dry-run") ||
    process.env.CHECKMATE_DRY_RUN === "1" ||
    process.env.CHECKMATE_MODEL_PROVIDER === "mock";

  const keyPresent = hasLiveKey();
  let mode: ComparisonReport["mode"];
  let useMock: boolean;
  let liveEvalStatus: ComparisonReport["liveEvalStatus"];
  let topLabel: RunLabel;
  let disclaimer: string;

  if (wantLive && !forceMockFlag && keyPresent) {
    mode = "live";
    useMock = false;
    liveEvalStatus = "ran";
    topLabel = "LIVE";
    disclaimer =
      "Live run — actual model metrics; document incomplete/failed cases honestly.";
  } else if (wantLive && !keyPresent) {
    mode = "skipped-no-key";
    useMock = true;
    liveEvalStatus = "skipped-no-key";
    topLabel = "SKIPPED-NO-KEY";
    disclaimer = `LIVE REQUESTED BUT SKIPPED: no ${missingKeyHint()}. Ran mock harness only — NOT model metrics. Do not invent CDR numbers.`;
  } else {
    mode = "mock";
    useMock = true;
    liveEvalStatus = "mock-only";
    topLabel = "MOCK-SMOKE";
    disclaimer =
      "MOCK harness smoke — not real model evaluation metrics. Do not cite as CDR / model improvements.";
  }

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
    `=== evaluate (baseline + checkmate + compare) ${mode.toUpperCase()} ===\n` +
      `${disclaimer}\n` +
      `matchPolicy=${MATCH_POLICY_ID}\n`,
  );

  if (mode === "skipped-no-key") {
    console.log(
      `SKIPPED live eval: set ${missingKeyHint()} in .env (see PROVIDE_CHECKLIST.md).\n`,
    );
  }

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

      const rowLabel: RunLabel =
        mode === "skipped-no-key"
          ? "SKIPPED-NO-KEY"
          : baseline.isMockEval || checkmate.isMockEval
            ? "MOCK-SMOKE"
            : "LIVE";

      rows.push({
        caseId,
        baseline: bScore,
        checkmate: cScore,
        baselineMock: baseline.isMockEval,
        checkmateMock: checkmate.isMockEval,
        label: rowLabel,
        baselineRunId: baseline.runId,
        checkmateRunId: checkmate.runId,
        mentalModelPath: path.relative(root, checkmate.mentalModelPath),
      });
    } catch (err) {
      rows.push({
        caseId,
        baseline: null,
        checkmate: null,
        baselineMock: useMock,
        checkmateMock: useMock,
        label: "ERROR",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const scored = rows.filter((r) => r.baseline && r.checkmate);
  const metricsAreLive = mode === "live" && scored.every((r) => r.label === "LIVE");
  const bRecalls = scored.map((r) => r.baseline!.recall);
  const cRecalls = scored.map((r) => r.checkmate!.recall);
  const bPrecs = scored
    .map((r) => r.baseline!.precision)
    .filter((p): p is number => p !== null);
  const cPrecs = scored
    .map((r) => r.checkmate!.precision)
    .filter((p): p is number => p !== null);

  const meanB = mean(bRecalls);
  const meanC = mean(cRecalls);

  const report: ComparisonReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    label: topLabel,
    disclaimer,
    liveEvalStatus,
    matchPolicy: MATCH_POLICY,
    resourceParity: RESOURCE_PARITY,
    model: {
      requested: requestedModel(),
      providerEnv: process.env.CHECKMATE_MODEL_PROVIDER?.trim() || "huggingface",
      openaiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
      huggingfaceKeyPresent: Boolean(getHfToken()),
      anthropicKeyPresent: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    },
    aggregates: {
      casesAttempted: rows.length,
      casesScored: scored.length,
      casesErrored: rows.filter((r) => r.label === "ERROR").length,
      baseline: {
        truePositives: sum(scored.map((r) => r.baseline!.truePositives)),
        falseNegatives: sum(scored.map((r) => r.baseline!.falseNegatives)),
        falsePositives: sum(scored.map((r) => r.baseline!.falsePositives)),
        meanRecall: meanB,
        meanPrecision: mean(bPrecs),
      },
      checkmate: {
        truePositives: sum(scored.map((r) => r.checkmate!.truePositives)),
        falseNegatives: sum(scored.map((r) => r.checkmate!.falseNegatives)),
        falsePositives: sum(scored.map((r) => r.checkmate!.falsePositives)),
        meanRecall: meanC,
        meanPrecision: mean(cPrecs),
      },
      deltaMeanRecall:
        metricsAreLive && meanB !== null && meanC !== null
          ? meanC - meanB
          : mode === "mock" || mode === "skipped-no-key"
            ? meanB !== null && meanC !== null
              ? meanC - meanB
              : null
            : null,
      metricsAreLive,
    },
    livePlaceholders: {
      note: metricsAreLive
        ? "Live metrics present in aggregates; placeholders left for submission packing."
        : "Pending HF_TOKEN (default) or CHECKMATE_MODEL_PROVIDER=openai + OPENAI_API_KEY + pnpm evaluate -- --live",
      criticalDefectRecall_baseline: null,
      criticalDefectRecall_checkmate: null,
      precision_baseline: null,
      precision_checkmate: null,
      costEstimateUsd: null,
      wallTimeTotalMs: null,
    },
    rows,
    sampleTrajectories: [
      "trajectories/sample-baseline-01-auth-idor-mock.json",
      "trajectories/sample-checkmate-01-auth-idor-mock.json",
    ],
    viewerHint:
      "Open apps/web/index.html via `pnpm view:results` (serves comparison JSON).",
  };

  // Console table
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
    if (row.error || !row.baseline || !row.checkmate) {
      console.log(
        `${row.caseId.padEnd(24)}  ${row.label}${row.error ? `: ${row.error}` : ""}`,
      );
      continue;
    }
    const b = row.baseline;
    const c = row.checkmate;
    const delta = c.recall - b.recall;
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
        row.label,
      ].join("  "),
    );
  }

  const resultsDir = path.join(root, "artifacts", "results");
  await fs.mkdir(resultsDir, { recursive: true });
  const jsonPath = path.join(resultsDir, "comparison.json");
  const mdPath = path.join(resultsDir, "comparison.md");
  const legacyPath = path.join(root, "artifacts", "comparison-table.json");
  const viewerDataPath = path.join(
    root,
    "apps",
    "web",
    "data",
    "comparison.json",
  );

  const jsonBody = JSON.stringify(report, null, 2) + "\n";
  const mdBody = buildMarkdown(report);

  await fs.writeFile(jsonPath, jsonBody);
  await fs.writeFile(mdPath, mdBody);
  await fs.writeFile(legacyPath, jsonBody);
  await fs.mkdir(path.dirname(viewerDataPath), { recursive: true });
  await fs.writeFile(viewerDataPath, jsonBody);

  console.log(`\nWrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${legacyPath}`);
  console.log(`Wrote ${viewerDataPath}`);
  if (!metricsAreLive) {
    console.log(
      `\nNOTE: Label=${topLabel}. Do not cite mock/skipped scores as model CDR.`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
