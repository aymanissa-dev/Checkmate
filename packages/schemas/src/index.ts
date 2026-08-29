import { z } from "zod";

/** Schema contract version for all Checkmate evaluation artifacts. */
export const SCHEMA_VERSION = 1 as const;

export const SeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type Severity = z.infer<typeof SeveritySchema>;

export const DefectClassSchema = z.enum([
  "authz",
  "authn",
  "injection",
  "ssrf",
  "race",
  "path-traversal",
  "integrity",
  "test-gap",
  "secret-leak",
  "consistency",
  "other",
]);
export type DefectClass = z.infer<typeof DefectClassSchema>;

export const LocatorSchema = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  symbol: z.string().optional(),
});
export type Locator = z.infer<typeof LocatorSchema>;

export const ToolNameSchema = z.enum([
  "list_files",
  "read_file",
  "search",
  "run_command",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

/** Checkmate staged procedure stages (single agent, not multi-agent theater). */
export const CheckmateStageSchema = z.enum([
  "scope",
  "understand",
  "model",
  "hypothesize",
  "verify",
  "report",
]);
export type CheckmateStage = z.infer<typeof CheckmateStageSchema>;

/**
 * Agent-facing mental model of an application under review.
 * Must never include ground-truth defect IDs or scorer-only fields.
 */
export const ApplicationMentalModelSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  caseId: z.string().min(1),
  summary: z.string().min(1),
  components: z.array(z.string()).default([]),
  trustBoundaries: z.array(z.string()).default([]),
  dataStores: z.array(z.string()).default([]),
  entryPoints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
});
export type ApplicationMentalModel = z.infer<
  typeof ApplicationMentalModelSchema
>;

/**
 * A candidate finding produced by baseline or Checkmate.
 * matchKeys are used by the scorer for deterministic matching.
 */
export const FindingSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  defectClass: DefectClassSchema.optional(),
  description: z.string().min(1),
  locators: z.array(LocatorSchema).default([]),
  matchKeys: z.array(z.string().min(1)).default([]),
  confidence: z.number().min(0).max(1).optional(),
  proofIds: z.array(z.string()).default([]),
  /**
   * Verification status for Checkmate findings.
   * Confirmed requires proof with toolResultRefs; unverified must not invent severity certainty.
   */
  verificationStatus: z
    .enum(["confirmed", "unverified", "inconclusive", "refuted"])
    .optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const FindingsDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  caseId: z.string().min(1),
  producedBy: z.enum(["baseline", "checkmate", "fixture", "human"]),
  findings: z.array(FindingSchema),
});
export type FindingsDocument = z.infer<typeof FindingsDocumentSchema>;

/**
 * Reference from a proof to a real trajectory tool_result step.
 * Confirmed findings must cite at least one such ref (or an on-disk proof artifact).
 */
export const ToolResultRefSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  toolName: ToolNameSchema.optional(),
  excerpt: z.string().optional(),
});
export type ToolResultRef = z.infer<typeof ToolResultRefSchema>;

/**
 * Evidence / proof attached to a finding (agent-produced).
 */
export const ProofSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  findingId: z.string().min(1),
  kind: z.enum([
    "code-citation",
    "command-output",
    "http-response",
    "reasoning",
    "other",
  ]),
  summary: z.string().min(1),
  details: z.string().optional(),
  locators: z.array(LocatorSchema).default([]),
  command: z.string().optional(),
  stdoutExcerpt: z.string().optional(),
  /** When true, claim was verified via sandbox tool output — not speculation. */
  verified: z.boolean().optional(),
  /** Trajectory tool_result step indexes that back this proof. */
  toolResultRefs: z.array(ToolResultRefSchema).default([]),
  /** Relative path under the run artifacts dir (e.g. proofs/P1.json). */
  artifactPath: z.string().optional(),
});
export type Proof = z.infer<typeof ProofSchema>;

/**
 * Testable critical-risk claim produced in the Hypothesize stage.
 * Must not invent severity for unverified claims.
 */
export const HypothesisSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  claim: z.string().min(1),
  /** Suspected class — informational until verified. */
  defectClass: DefectClassSchema.optional(),
  /** Proposed severity only if later confirmed; otherwise omit or treat as tentative. */
  tentativeSeverity: SeveritySchema.optional(),
  relatedComponents: z.array(z.string()).default([]),
  proposedCheck: z.string().min(1),
  status: z.enum([
    "proposed",
    "confirmed",
    "refuted",
    "unverified",
    "inconclusive",
  ]),
  proofIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const HypothesesDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  caseId: z.string().min(1),
  hypotheses: z.array(HypothesisSchema),
});
export type HypothesesDocument = z.infer<typeof HypothesesDocumentSchema>;

/**
 * Scorer-only ground-truth defect. Lives in cases/<id>/truth.json.
 * MUST NEVER appear in agent-visible context, prompts, or tool roots.
 */
export const GroundTruthDefectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  defectClass: DefectClassSchema,
  description: z.string().min(1),
  locators: z.array(LocatorSchema).default([]),
  /** Keys that must appear (any or all depending on scorer policy) for a hit. */
  matchKeys: z.array(z.string().min(1)).min(1),
  /** Optional aliases / synonyms for matching. */
  matchAliases: z.array(z.string()).default([]),
  requiredSeverityAtLeast: SeveritySchema.optional(),
});
export type GroundTruthDefect = z.infer<typeof GroundTruthDefectSchema>;

export const EvaluationCaseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  caseId: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  defects: z.array(GroundTruthDefectSchema).min(1),
  notes: z.string().optional(),
});
export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;

export const TrajectoryStepSchema = z.object({
  index: z.number().int().nonnegative(),
  type: z.enum(["message", "tool_call", "tool_result", "final"]),
  role: z.enum(["system", "user", "assistant", "tool"]).optional(),
  content: z.string().optional(),
  toolName: ToolNameSchema.optional(),
  toolArgs: z.record(z.unknown()).optional(),
  toolResult: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  /** Checkmate stage label when the step belongs to the staged loop. */
  stage: CheckmateStageSchema.optional(),
});
export type TrajectoryStep = z.infer<typeof TrajectoryStepSchema>;

export const TrajectorySchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  caseId: z.string().min(1),
  runId: z.string().min(1),
  agent: z.enum(["baseline", "checkmate", "fixture"]),
  model: z.string().optional(),
  provider: z.string().optional(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  budget: z
    .object({
      maxToolCalls: z.number().int().positive().optional(),
      maxWallTimeMs: z.number().int().positive().optional(),
    })
    .optional(),
  usage: z
    .object({
      toolCalls: z.number().int().nonnegative(),
      wallTimeMs: z.number().int().nonnegative().optional(),
    })
    .optional(),
  steps: z.array(TrajectoryStepSchema),
  findingsPath: z.string().optional(),
  notes: z.string().optional(),
});
export type Trajectory = z.infer<typeof TrajectorySchema>;

export const ScoreMatchSchema = z.object({
  defectId: z.string(),
  matched: z.boolean(),
  findingId: z.string().optional(),
  matchedOn: z.array(z.string()).default([]),
  reason: z.string().optional(),
});
export type ScoreMatch = z.infer<typeof ScoreMatchSchema>;

export const ScoreReportSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  caseId: z.string(),
  producedBy: z.string(),
  truePositives: z.number().int().nonnegative(),
  falseNegatives: z.number().int().nonnegative(),
  falsePositives: z.number().int().nonnegative(),
  recall: z.number().min(0).max(1),
  precision: z.number().min(0).max(1).nullable(),
  matches: z.array(ScoreMatchSchema),
  unmatchedFindingIds: z.array(z.string()).default([]),
});
export type ScoreReport = z.infer<typeof ScoreReportSchema>;
