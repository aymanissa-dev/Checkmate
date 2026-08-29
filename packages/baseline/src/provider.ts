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
    return { mode: "openai", note: "OpenAI provider selected" };
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
  // Implicit selection when provider unset: prefer OpenAI, then HF, then Anthropic
  if (process.env.OPENAI_API_KEY?.trim()) {
    return { mode: "openai", note: "OpenAI provider selected (OPENAI_API_KEY)" };
  }
  if (getHfToken()) {
    return {
      mode: "huggingface",
      note: "Hugging Face provider selected (HF_TOKEN / HUGGINGFACE_API_KEY)",
    };
  }
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return { mode: "anthropic", note: "Anthropic provider selected" };
  }
  return {
    mode: "unset",
    note: "No API key / provider — use CHECKMATE_DRY_RUN=1 or CHECKMATE_MODEL_PROVIDER=mock",
  };
}
