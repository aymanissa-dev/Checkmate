import type { ModelAction, ModelProvider, ChatMessage, ToolSpec } from "./provider.js";
import { parseModelAction } from "./openai-provider.js";

/**
 * Hugging Face Inference Providers (OpenAI-compatible router).
 *
 * Endpoint: https://router.huggingface.co/v1/chat/completions
 * Auth: HF_TOKEN or HUGGINGFACE_API_KEY (fine-grained token with
 * "Make calls to Inference Providers" permission).
 *
 * Mode: **HF-compatible structured JSON** (same protocol as OpenAIProvider).
 * The agent tool loop is driven by JSON `tool_call` / `final` actions parsed
 * from chat content — not by unreliable native `tools` across all HF backends.
 * Native `tool_calls` are accepted when a backend returns them; otherwise we
 * fall back to JSON-in-prompt (documented HF-compatible mode).
 *
 * Default model: Qwen/Qwen2.5-Coder-7B-Instruct (available on Inference
 * Providers router; not Meta-gated). Override with CHECKMATE_MODEL.
 * Optional provider pin: append `:fastest` | `:cheapest` | `:novita` etc.
 * Note: Qwen/Qwen2.5-7B-Instruct may return model_not_supported on some accounts.
 */

export const HF_ROUTER_BASE_URL = "https://router.huggingface.co/v1";

/** Sensible default for instruction chat on HF Inference Providers. */
export const DEFAULT_HF_MODEL = "Qwen/Qwen2.5-Coder-7B-Instruct";

const ACTION_SYSTEM = `
You are reviewing a codebase. Respond with a single JSON object only, one of:
{"type":"tool_call","toolName":"list_files"|"read_file"|"search"|"run_command","toolArgs":{...}}
{"type":"final","findingsJson":"<stringified FindingsDocument JSON>"}
FindingsDocument shape: {schemaVersion:1,caseId,producedBy:"baseline",findings:[{schemaVersion:1,id,title,severity,defectClass?,description,locators,matchKeys,proofIds}]}
Use tools until you can cite concrete evidence. Prefer critical security/correctness issues.
`.trim();

export function getHfToken(
  opts?: { apiKey?: string },
): string | undefined {
  const fromOpts = opts?.apiKey?.trim();
  if (fromOpts) return fromOpts;
  const a = process.env.HF_TOKEN?.trim();
  if (a) return a;
  const b = process.env.HUGGINGFACE_API_KEY?.trim();
  if (b) return b;
  return undefined;
}

export function isHuggingFaceProviderName(name: string): boolean {
  const n = name.toLowerCase();
  return n === "huggingface" || n === "hf";
}

export class HuggingFaceProvider implements ModelProvider {
  readonly name = "huggingface";
  readonly model: string;
  /** True when using JSON-in-prompt protocol (always the primary path). */
  readonly structuredJsonMode = true as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  /** When true, also send OpenAI-style `tools` and prefer native tool_calls. */
  private readonly preferNativeTools: boolean;

  constructor(opts?: {
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    preferNativeTools?: boolean;
  }) {
    this.model =
      opts?.model ??
      process.env.CHECKMATE_MODEL ??
      DEFAULT_HF_MODEL;
    const token = getHfToken(opts);
    if (!token) {
      throw new Error(
        "HuggingFaceProvider requires HF_TOKEN or HUGGINGFACE_API_KEY",
      );
    }
    this.apiKey = token;
    this.baseUrl =
      opts?.baseUrl ??
      process.env.HF_BASE_URL ??
      process.env.HUGGINGFACE_BASE_URL ??
      HF_ROUTER_BASE_URL;
    this.preferNativeTools =
      opts?.preferNativeTools ??
      process.env.CHECKMATE_HF_NATIVE_TOOLS === "1";
  }

  async nextAction(input: {
    messages: ChatMessage[];
    tools: ToolSpec[];
    step: number;
  }): Promise<ModelAction> {
    const messages = [
      { role: "system", content: ACTION_SYSTEM },
      ...input.messages.map((m) => ({
        role: m.role === "tool" ? "user" : m.role,
        content:
          m.role === "tool"
            ? `TOOL_RESULT (${m.name ?? "tool"}):\n${m.content}`
            : m.content,
      })),
    ];

    const body: Record<string, unknown> = {
      model: this.model,
      temperature: 0.2,
      messages,
    };

    // Prefer json_object when supported; some HF backends reject it — retry without.
    if (this.preferNativeTools && input.tools.length > 0) {
      body.tools = input.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: "object",
            properties: t.parameters,
          },
        },
      }));
      body.tool_choice = "auto";
    } else {
      body.response_format = { type: "json_object" };
    }

    let res = await this.chat(body);
    if (!res.ok && body.response_format) {
      // HF-compatible fallback: drop response_format if backend rejects it
      const errText = await res.text();
      if (
        res.status === 400 ||
        /response_format|json_object|unsupported/i.test(errText)
      ) {
        delete body.response_format;
        res = await this.chat(body);
      } else {
        throw new Error(
          `Hugging Face error ${res.status}: ${errText.slice(0, 500)}`,
        );
      }
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Hugging Face error ${res.status}: ${text.slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const message = data.choices?.[0]?.message;
    const native = message?.tool_calls?.[0];
    if (native?.function?.name) {
      const toolName = native.function.name;
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(native.function.arguments ?? "{}") as Record<
          string,
          unknown
        >;
      } catch {
        toolArgs = {};
      }
      const allowed = new Set([
        "list_files",
        "read_file",
        "search",
        "run_command",
      ]);
      if (allowed.has(toolName)) {
        return {
          type: "tool_call",
          toolName: toolName as
            | "list_files"
            | "read_file"
            | "search"
            | "run_command",
          toolArgs,
          assistantText: message?.content ?? undefined,
        };
      }
    }

    const content = message?.content ?? "{}";
    return parseModelAction(content);
  }

  private chat(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}
