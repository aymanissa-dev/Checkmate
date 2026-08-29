import type { ModelAction, ModelProvider, ChatMessage, ToolSpec } from "./provider.js";

/**
 * Thin OpenAI Chat Completions wiring.
 * Requires OPENAI_API_KEY. Dependency-free (fetch only).
 */
export class OpenAIProvider implements ModelProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts?: { model?: string; apiKey?: string; baseUrl?: string }) {
    this.model = opts?.model ?? process.env.CHECKMATE_MODEL ?? "gpt-4o-mini";
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.baseUrl =
      opts?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    if (!this.apiKey) {
      throw new Error("OpenAIProvider requires OPENAI_API_KEY");
    }
  }

  async nextAction(input: {
    messages: ChatMessage[];
    tools: ToolSpec[];
    step: number;
  }): Promise<ModelAction> {
    const systemExtra = `
You are reviewing a codebase. Respond with a single JSON object only, one of:
{"type":"tool_call","toolName":"list_files"|"read_file"|"search"|"run_command","toolArgs":{...}}
{"type":"final","findingsJson":"<stringified FindingsDocument JSON>"}
FindingsDocument shape: {schemaVersion:1,caseId,producedBy:"baseline",findings:[{schemaVersion:1,id,title,severity,defectClass?,description,locators,matchKeys,proofIds}]}
Use tools until you can cite concrete evidence. Prefer critical security/correctness issues.
`.trim();

    const messages = [
      { role: "system", content: systemExtra },
      ...input.messages.map((m) => ({
        role: m.role === "tool" ? "user" : m.role,
        content:
          m.role === "tool"
            ? `TOOL_RESULT (${m.name ?? "tool"}):\n${m.content}`
            : m.content,
      })),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return parseModelAction(content);
  }
}

const TOOL_NAMES = new Set([
  "list_files",
  "read_file",
  "search",
  "run_command",
]);

export function parseModelAction(content: string): ModelAction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) {
      return {
        type: "final",
        findingsJson: JSON.stringify({
          schemaVersion: 1,
          caseId: "unknown",
          producedBy: "baseline",
          findings: [],
        }),
        assistantText: content.slice(0, 2000),
      };
    }
    parsed = JSON.parse(m[0]);
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type === "tool_call") {
    const toolName = String(obj.toolName ?? "");
    if (!TOOL_NAMES.has(toolName)) {
      return {
        type: "final",
        findingsJson: JSON.stringify({
          schemaVersion: 1,
          caseId: "unknown",
          producedBy: "baseline",
          findings: [],
        }),
        assistantText: `Invalid toolName: ${toolName}`,
      };
    }
    return {
      type: "tool_call",
      toolName: toolName as "list_files" | "read_file" | "search" | "run_command",
      toolArgs: (obj.toolArgs as Record<string, unknown>) ?? {},
      assistantText:
        typeof obj.assistantText === "string" ? obj.assistantText : undefined,
    };
  }
  return {
    type: "final",
    findingsJson:
      typeof obj.findingsJson === "string"
        ? obj.findingsJson
        : JSON.stringify(
            obj.findings
              ? {
                  schemaVersion: 1,
                  caseId: obj.caseId ?? "unknown",
                  producedBy: "baseline",
                  findings: obj.findings,
                }
              : obj,
          ),
    assistantText:
      typeof obj.assistantText === "string" ? obj.assistantText : undefined,
  };
}
