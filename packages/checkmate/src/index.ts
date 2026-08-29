/**
 * Checkmate advanced agent — STUB ONLY (Phase D+).
 * Same tool surface as baseline; mental model + verify loop not implemented yet.
 */
import type { ApplicationMentalModel, Finding, Proof } from "@checkmate/schemas";

export interface CheckmateRunOptions {
  caseId: string;
  caseAppDir: string;
  artifactsDir: string;
}

export interface CheckmatePlan {
  stages: Array<"mental_model" | "investigate" | "verify" | "report">;
  status: "not_implemented";
}

/** Entry types for the future advanced loop. */
export interface CheckmateState {
  mentalModel?: ApplicationMentalModel;
  findings: Finding[];
  proofs: Proof[];
}

export function getCheckmatePlan(): CheckmatePlan {
  return {
    stages: ["mental_model", "investigate", "verify", "report"],
    status: "not_implemented",
  };
}

export async function runCheckmate(_opts: CheckmateRunOptions): Promise<never> {
  throw new Error(
    "Checkmate advanced agent is not implemented yet (Phase D+). " +
      "Use `pnpm evaluate:baseline` for the fair one-shot baseline.",
  );
}
