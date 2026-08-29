import fs from "node:fs/promises";
import path from "node:path";
import {
  EvaluationCaseSchema,
  FindingsDocumentSchema,
  ScoreReportSchema,
  type EvaluationCase,
  type Finding,
  type FindingsDocument,
  type GroundTruthDefect,
  type ScoreMatch,
  type ScoreReport,
  type Severity,
} from "@checkmate/schemas";

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findingTextBlob(f: Finding): string {
  const parts = [
    f.title,
    f.description,
    f.defectClass ?? "",
    ...f.matchKeys,
    ...f.locators.map((l) => `${l.path} ${l.symbol ?? ""}`),
  ];
  return normalizeKey(parts.join(" "));
}

function defectMatched(
  defect: GroundTruthDefect,
  finding: Finding,
): { matched: boolean; matchedOn: string[] } {
  const blob = findingTextBlob(finding);
  const keys = [...defect.matchKeys, ...defect.matchAliases];
  const matchedOn: string[] = [];
  for (const key of keys) {
    const nk = normalizeKey(key);
    if (!nk) continue;
    if (blob.includes(nk)) matchedOn.push(key);
  }
  // Require at least one primary matchKey (not only aliases) OR ≥1 alias if
  // primary keys are all present as substrings of finding matchKeys/title.
  const primaryHits = defect.matchKeys.filter((k) =>
    matchedOn.includes(k),
  );
  const matched = primaryHits.length >= 1;

  if (!matched) return { matched: false, matchedOn };

  if (defect.requiredSeverityAtLeast) {
    const need = SEVERITY_RANK[defect.requiredSeverityAtLeast];
    if (SEVERITY_RANK[finding.severity] < need) {
      return {
        matched: false,
        matchedOn: [
          ...matchedOn,
          `severity_too_low:${finding.severity}<${defect.requiredSeverityAtLeast}`,
        ],
      };
    }
  }

  // Soft locator boost: if truth has locators, prefer findings that cite same path
  if (defect.locators.length > 0 && finding.locators.length > 0) {
    const truthPaths = new Set(
      defect.locators.map((l) => l.path.replace(/\\/g, "/").toLowerCase()),
    );
    const hitPath = finding.locators.some((l) =>
      truthPaths.has(l.path.replace(/\\/g, "/").toLowerCase()),
    );
    if (hitPath) matchedOn.push("locator_path");
  }

  return { matched: true, matchedOn };
}

/**
 * Deterministic scorer: match findings against ground truth without LLM.
 * Greedy 1:1 matching — each finding used at most once.
 */
export function scoreFindings(
  evaluationCase: EvaluationCase,
  findingsDoc: FindingsDocument,
): ScoreReport {
  const unused = [...findingsDoc.findings];
  const matches: ScoreMatch[] = [];

  for (const defect of evaluationCase.defects) {
    let bestIdx = -1;
    let bestMatchedOn: string[] = [];
    for (let i = 0; i < unused.length; i++) {
      const f = unused[i]!;
      const { matched, matchedOn } = defectMatched(defect, f);
      if (matched && matchedOn.length > bestMatchedOn.length) {
        bestIdx = i;
        bestMatchedOn = matchedOn;
      }
    }
    if (bestIdx >= 0) {
      const finding = unused.splice(bestIdx, 1)[0]!;
      matches.push({
        defectId: defect.id,
        matched: true,
        findingId: finding.id,
        matchedOn: bestMatchedOn,
      });
    } else {
      matches.push({
        defectId: defect.id,
        matched: false,
        matchedOn: [],
        reason: "no_matching_finding",
      });
    }
  }

  const truePositives = matches.filter((m) => m.matched).length;
  const falseNegatives = matches.filter((m) => !m.matched).length;
  const falsePositives = unused.length;
  const totalDefects = evaluationCase.defects.length;
  const predicted = findingsDoc.findings.length;
  const recall = totalDefects === 0 ? 0 : truePositives / totalDefects;
  const precision = predicted === 0 ? null : truePositives / predicted;

  return ScoreReportSchema.parse({
    schemaVersion: 1,
    caseId: evaluationCase.caseId,
    producedBy: findingsDoc.producedBy,
    truePositives,
    falseNegatives,
    falsePositives,
    recall,
    precision,
    matches,
    unmatchedFindingIds: unused.map((f) => f.id),
  });
}

export async function loadEvaluationCase(
  truthPath: string,
): Promise<EvaluationCase> {
  const raw = JSON.parse(await fs.readFile(truthPath, "utf8"));
  return EvaluationCaseSchema.parse(raw);
}

export async function loadFindingsDocument(
  findingsPath: string,
): Promise<FindingsDocument> {
  const raw = JSON.parse(await fs.readFile(findingsPath, "utf8"));
  return FindingsDocumentSchema.parse(raw);
}

export async function scoreCaseDir(
  caseDir: string,
  findingsPath: string,
): Promise<ScoreReport> {
  const truthPath = path.join(caseDir, "truth.json");
  const evaluationCase = await loadEvaluationCase(truthPath);
  const findingsDoc = await loadFindingsDocument(findingsPath);
  if (findingsDoc.caseId !== evaluationCase.caseId) {
    throw new Error(
      `caseId mismatch: findings=${findingsDoc.caseId} truth=${evaluationCase.caseId}`,
    );
  }
  return scoreFindings(evaluationCase, findingsDoc);
}

export function repoRootFromHere(importMetaUrl: string): string {
  // packages/eval/src -> repo root
  return path.resolve(path.dirname(new URL(importMetaUrl).pathname), "../../..");
}
