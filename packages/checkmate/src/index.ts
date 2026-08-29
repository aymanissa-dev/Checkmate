/**
 * Checkmate advanced agent — staged mental-model + verification loop (Phase D).
 * Same tool surface as baseline; mock pipeline for CI; OpenAI for real runs.
 */
export {
  runCheckmate,
  getCheckmatePlan,
  CHECKMATE_STAGES,
  DEFAULT_CHECKMATE_BUDGET,
} from "./runner.js";
export type {
  CheckmateRunOptions,
  CheckmateRunResult,
  CheckmateBudget,
} from "./runner.js";
export type { CheckmatePlan } from "./plan.js";
export {
  CHECKMATE_SYSTEM_PREAMBLE,
  CRITICAL_DEFECT_VERIFICATION_SKILL,
  stageSystemPrompt,
} from "./prompts.js";
