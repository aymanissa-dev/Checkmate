/**
 * Unit tests for Hugging Face provider wiring (no live CDR claims).
 * Run: pnpm exec tsx packages/baseline/src/huggingface-provider.test.ts
 */
import assert from "node:assert/strict";
import {
  HuggingFaceProvider,
  DEFAULT_HF_MODEL,
  getHfToken,
  isHuggingFaceProviderName,
} from "./huggingface-provider.js";
import { getProviderFromEnv, DEFAULT_MODEL_PROVIDER } from "./provider.js";
import { resolveProvider } from "./runner.js";
import { parseModelAction } from "./openai-provider.js";

function withEnv(
  patch: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(patch)) {
    prev[k] = process.env[k];
    const v = patch[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const k of Object.keys(patch)) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    });
}

async function main(): Promise<void> {
  assert.equal(DEFAULT_MODEL_PROVIDER, "huggingface");
  assert.equal(isHuggingFaceProviderName("huggingface"), true);
  assert.equal(isHuggingFaceProviderName("hf"), true);
  assert.equal(isHuggingFaceProviderName("openai"), false);

  // Default when unset + HF token → huggingface (not OpenAI)
  await withEnv(
    {
      HF_TOKEN: "hf_test",
      HUGGINGFACE_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
      CHECKMATE_MODEL_PROVIDER: undefined,
      CHECKMATE_DRY_RUN: undefined,
      ANTHROPIC_API_KEY: undefined,
      CHECKMATE_MODEL: undefined,
    },
    () => {
      assert.equal(getHfToken(), "hf_test");
      const env = getProviderFromEnv();
      assert.equal(env.mode, "huggingface");
      const r = resolveProvider("01-auth-idor");
      assert.equal(r.mode, "huggingface");
      assert.equal(r.isMock, false);
      assert.equal(r.provider.name, "huggingface");
      assert.equal(r.provider.model, DEFAULT_HF_MODEL);
    },
  );

  // Unset + OpenAI key only → still NOT openai (HF is default; OpenAI is opt-in)
  await withEnv(
    {
      HF_TOKEN: undefined,
      HUGGINGFACE_API_KEY: undefined,
      OPENAI_API_KEY: "sk-test",
      CHECKMATE_MODEL_PROVIDER: undefined,
      CHECKMATE_DRY_RUN: undefined,
      ANTHROPIC_API_KEY: undefined,
    },
    () => {
      const env = getProviderFromEnv();
      assert.equal(env.mode, "unset");
      assert.match(env.note, /huggingface/i);
      assert.match(env.note, /HF_TOKEN/);
      const r = resolveProvider("01-auth-idor");
      assert.equal(r.isMock, true);
    },
  );

  // Explicit openai + key → openai
  await withEnv(
    {
      HF_TOKEN: undefined,
      OPENAI_API_KEY: "sk-test",
      CHECKMATE_MODEL_PROVIDER: "openai",
      CHECKMATE_DRY_RUN: undefined,
      ANTHROPIC_API_KEY: undefined,
      CHECKMATE_MODEL: undefined,
    },
    () => {
      const env = getProviderFromEnv();
      assert.equal(env.mode, "openai");
      const r = resolveProvider("01-auth-idor");
      assert.equal(r.mode, "openai");
      assert.equal(r.provider.model, "gpt-4o-mini");
    },
  );

  // Unset + no keys → unset (resolveProvider falls back to mock)
  await withEnv(
    {
      HF_TOKEN: undefined,
      HUGGINGFACE_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
      CHECKMATE_MODEL_PROVIDER: undefined,
      CHECKMATE_DRY_RUN: undefined,
      ANTHROPIC_API_KEY: undefined,
    },
    () => {
      const env = getProviderFromEnv();
      assert.equal(env.mode, "unset");
      assert.match(env.note, /HF_TOKEN/);
      const r = resolveProvider("01-auth-idor");
      assert.equal(r.isMock, true);
    },
  );

  // Mock still works without keys
  await withEnv(
    {
      HF_TOKEN: undefined,
      OPENAI_API_KEY: undefined,
      CHECKMATE_MODEL_PROVIDER: "mock",
      CHECKMATE_DRY_RUN: undefined,
    },
    () => {
      const env = getProviderFromEnv();
      assert.equal(env.mode, "mock");
      const r = resolveProvider("01-auth-idor");
      assert.equal(r.isMock, true);
    },
  );

  await withEnv(
    {
      HF_TOKEN: undefined,
      HUGGINGFACE_API_KEY: "hf_alias",
      OPENAI_API_KEY: undefined,
      CHECKMATE_MODEL_PROVIDER: "hf",
      CHECKMATE_DRY_RUN: undefined,
      ANTHROPIC_API_KEY: undefined,
      CHECKMATE_MODEL: "Qwen/Qwen2.5-Coder-7B-Instruct:cheapest",
    },
    () => {
      assert.equal(getHfToken(), "hf_alias");
      const env = getProviderFromEnv();
      assert.equal(env.mode, "huggingface");
      const r = resolveProvider("01-auth-idor");
      assert.equal(r.provider.model, "Qwen/Qwen2.5-Coder-7B-Instruct:cheapest");
    },
  );

  await withEnv(
    {
      HF_TOKEN: undefined,
      HUGGINGFACE_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
      CHECKMATE_MODEL_PROVIDER: "huggingface",
      CHECKMATE_DRY_RUN: undefined,
      ANTHROPIC_API_KEY: undefined,
    },
    () => {
      const env = getProviderFromEnv();
      assert.equal(env.mode, "unset");
      assert.match(env.note, /HF_TOKEN/);
    },
  );

  // Mocked fetch: structured JSON tool_call
  await withEnv(
    {
      HF_TOKEN: "hf_test",
      CHECKMATE_MODEL_PROVIDER: "huggingface",
      CHECKMATE_DRY_RUN: undefined,
      OPENAI_API_KEY: undefined,
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    type: "tool_call",
                    toolName: "list_files",
                    toolArgs: { path: "." },
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )) as typeof fetch;

      try {
        const p = new HuggingFaceProvider({ apiKey: "hf_test" });
        const action = await p.nextAction({
          messages: [{ role: "user", content: "explore" }],
          tools: [],
          step: 0,
        });
        assert.equal(action.type, "tool_call");
        if (action.type === "tool_call") {
          assert.equal(action.toolName, "list_files");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );

  // Native tool_calls path when CHECKMATE_HF_NATIVE_TOOLS=1
  await withEnv(
    {
      HF_TOKEN: "hf_test",
      CHECKMATE_HF_NATIVE_TOOLS: "1",
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: "search",
                        arguments: JSON.stringify({ pattern: "TODO" }),
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )) as typeof fetch;

      try {
        const p = new HuggingFaceProvider({
          apiKey: "hf_test",
          preferNativeTools: true,
        });
        const action = await p.nextAction({
          messages: [{ role: "user", content: "find todos" }],
          tools: [
            {
              name: "search",
              description: "search",
              parameters: { pattern: { type: "string" } },
            },
          ],
          step: 0,
        });
        assert.equal(action.type, "tool_call");
        if (action.type === "tool_call") {
          assert.equal(action.toolName, "search");
          assert.equal(action.toolArgs.pattern, "TODO");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );

  const parsed = parseModelAction(
    JSON.stringify({
      type: "final",
      findingsJson: JSON.stringify({
        schemaVersion: 1,
        caseId: "x",
        producedBy: "baseline",
        findings: [],
      }),
    }),
  );
  assert.equal(parsed.type, "final");

  console.log("huggingface-provider.test.ts: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
