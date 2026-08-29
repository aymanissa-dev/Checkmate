import type { CheckmateStage } from "@checkmate/schemas";
import { CHECKMATE_STAGES } from "./prompts.js";

export { CHECKMATE_STAGES };

export interface CheckmatePlan {
  stages: CheckmateStage[];
  status: "ready";
  description: string;
}

export function getCheckmatePlan(): CheckmatePlan {
  return {
    stages: [...CHECKMATE_STAGES],
    status: "ready",
    description:
      "Single-agent staged procedure: scope → understand → model → hypothesize → verify → report",
  };
}
