/**
 * Frozen scorer matching policy (Phase E).
 *
 * Do not change matching semantics without a changelog ITERATION and
 * re-scoring all fixtures. Judges must be able to reproduce scores.
 */

/** Human-readable policy id written into comparison reports. */
export const MATCH_POLICY_ID = "matchKeys-v1-primary-greedy" as const;

export const MATCH_POLICY = {
  id: MATCH_POLICY_ID,
  version: 1,
  /** Primary truth.matchKeys: ≥1 must appear in the finding text blob. */
  primaryKeysRequired: 1,
  /** Aliases may contribute to matchedOn but do not alone create a hit. */
  aliasesAloneInsufficient: true,
  /** Finding blob = normalize(title + description + defectClass + matchKeys + locators). */
  findingBlobFields: [
    "title",
    "description",
    "defectClass",
    "matchKeys",
    "locators.path",
    "locators.symbol",
  ] as const,
  /** normalize: lower-case, non-alnum → space, trim. Substring includes. */
  normalize: "lower-alnum-space-substring",
  /** Optional severity floor from truth.requiredSeverityAtLeast. */
  severityGate: true,
  /** Soft signal only: same path appends "locator_path" to matchedOn. */
  locatorPathSoftBoost: true,
  /** Greedy 1:1 — each finding used at most once; prefer more matchedOn hits. */
  matching: "greedy-1to1-max-matchedOn",
} as const;

export type MatchPolicy = typeof MATCH_POLICY;
