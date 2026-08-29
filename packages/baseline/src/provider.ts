/**
 * Model provider abstraction — swap OpenAI/Hugging Face/Anthropic/mock without changing the loop.
 * Real LLM calls require API keys; mock/dry-run does not fabricate evaluation scores.
 */

import { getHfToken, isHuggingFaceProviderName } from "./huggingface-provider.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ModelAction =
  | {
      type: "tool_call";
      toolName: "list_files" | "read_file" | "search" | "run_command";
      toolArgs: Record<string, unknown>;
      assistantText?: string;
    }
  | {
      type: "final";
      findingsJson: string;
      assistantText?: string;
    };

export interface ModelProvider {
  readonly name: string;
  readonly model: string;
  nextAction(input: {
    messages: ChatMessage[];
    tools: ToolSpec[];
    step: number;
  }): Promise<ModelAction>;
}

export type ProviderMode =
  | "mock"
  | "openai"
  | "huggingface"
  | "anthropic"
  | "unset";

/** Default when CHECKMATE_MODEL_PROVIDER is unset. OpenAI is opt-in only. */
export const DEFAULT_MODEL_PROVIDER = "huggingface" as const;

export function getProviderFromEnv(): {
  mode: ProviderMode;
  note: string;
} {
  const explicit = (process.env.CHECKMATE_MODEL_PROVIDER ?? "").toLowerCase();
  if (explicit === "mock" || process.env.CHECKMATE_DRY_RUN === "1") {
    return { mode: "mock", note: "Explicit mock/dry-run mode" };
  }
  if (explicit === "openai") {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return {
        mode: "unset",
        note: "openai requested but OPENAI_API_KEY missing",
      };
    }
    return { mode: "openai", note: "OpenAI provider selected (explicit)" };
  }
  if (isHuggingFaceProviderName(explicit)) {
    if (!getHfToken()) {
      return {
        mode: "unset",
        note: "huggingface requested but HF_TOKEN / HUGGINGFACE_API_KEY missing",
      };
    }
    return {
      mode: "huggingface",
      note: "Hugging Face Inference Providers (OpenAI-compatible router) selected",
    };
  }
  if (explicit === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return {
        mode: "unset",
        note: "Anthropic requested but ANTHROPIC_API_KEY missing",
      };
    }
    return { mode: "anthropic", note: "Anthropic provider selected" };
  }
  if (explicit) {
    return {
      mode: "unset",
      note: `Unknown CHECKMATE_MODEL_PROVIDER=${explicit}`,
    };
  }
  // Default provider when unset: Hugging Face (OpenAI only if CHECKMATE_MODEL_PROVIDER=openai)
  if (getHfToken()) {
    return {
      mode: "huggingface",
      note: "Hugging Face provider (default when CHECKMATE_MODEL_PROVIDER unset)",
    };
  }
  return {
    mode: "unset",
    note: "Default provider is huggingface but HF_TOKEN / HUGGINGFACE_API_KEY missing — use CHECKMATE_DRY_RUN=1 / CHECKMATE_MODEL_PROVIDER=mock, or set HF_TOKEN for live (OpenAI: set CHECKMATE_MODEL_PROVIDER=openai + OPENAI_API_KEY)",
  };
}
