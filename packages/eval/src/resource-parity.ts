/**
 * Documented resource parity for fair baseline vs Checkmate comparison.
 * Independent variable = investigation procedure, not model family or tools.
 */

export const RESOURCE_PARITY = {
  schemaVersion: 1 as const,
  sameCases: true,
  sameToolSurface: [
    "list_files",
    "read_file",
    "search",
    "run_command",
  ] as const,
  sameFindingSchema: true,
  sameModelEnvVars: [
    "OPENAI_API_KEY",
    "HF_TOKEN",
    "HUGGINGFACE_API_KEY",
    "CHECKMATE_MODEL",
    "CHECKMATE_MODEL_PROVIDER",
  ] as const,
  /** Default model when live OpenAI; HF default is Qwen/Qwen2.5-7B-Instruct via provider. */
  defaultModel: "gpt-4o-mini",
  defaultHfModel: "Qwen/Qwen2.5-7B-Instruct",
  baselineBudget: {
    maxToolCalls: 40,
    maxWallTimeMs: 180_000,
  },
  checkmateBudget: {
    maxToolCalls: 48,
    maxWallTimeMs: 240_000,
    note: "Modest headroom for staged verify; same tools, no new agent tools",
  },
  differencesExplained: [
    "Checkmate adds mental-model + hypothesize + verify stages (procedure).",
    "Checkmate tool/time budget is slightly higher to allow sandbox proofs.",
    "Same provider/model env when live (OpenAI or Hugging Face); mock mode is harness smoke only.",
  ],
} as const;

export type ResourceParity = typeof RESOURCE_PARITY;
