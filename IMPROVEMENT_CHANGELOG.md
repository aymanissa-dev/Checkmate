# Improvement Changelog

Evaluation-first log of hypotheses, measurements, and keep/kill decisions.
**Do not invent metric numbers.** Incomplete measurements are marked explicitly.

---

## Stage: BASELINE

- **Date:** 2026-08-29
- **Hypothesis:** A fair one-shot senior-engineer review (structured findings JSON, shared tool surface, tool/time budget, no mental-model stage, no forced verify) is the right simple comparison baseline for Checkmate.
- **Metric before:** N/A (first measurement stage)
- **Metric after:** Incomplete — real LLM baseline numbers require API keys and are not fabricated. Harness validated via mock/dry-run + fixture scoring only.
- **What changed:** Implemented baseline runner, provider abstraction (OpenAI + mock), budgets, trajectory/findings artifacts, and scoring wiring.
- **Decision:** **Keep** as the comparison baseline for Phase D+ Checkmate work.
- **Notes:** Mock fixture scores must never be reported as model performance.

---

## ITERATION: Mental-model + verification loop (Phase D)

- **Date:** 2026-08-29
- **Hypothesis:** A single-agent staged procedure (scope → understand → model → hypothesize → verify → report) that forces sandbox verification before confirming findings will outperform one-shot baseline on critical defect recall/precision once real LLMs are used — without leaking ground truth.
- **Change:** Implemented Checkmate runner with stage state machine, intermediate artifacts under `artifacts/<runId>/`, proof objects with `toolResultRefs`, mock pipeline for CI, OpenAI path for keyed runs, and `pnpm evaluate` comparison table (mock-labeled).
- **Why:** Verification-over-generation should reduce speculative severity and improve confirmed hit quality vs one-shot generation.
- **Metric before:** Pending real LLM baseline run (API keys required) — **not fabricated**.
- **Metric after:** Pending real LLM Checkmate run — **not fabricated**. Mock/dry-run only validates harness completeness (all 10 cases, mental_model present, guard passes).
- **Decision:** **Keep** implementation for measured comparison; do not claim CDR/production improvements until keyed runs complete.
- **Notes:** Budget comparable to baseline (48 tool calls / 240s vs 40 / 180s). Same tool surface; no new agent tools.

---

## ITERATION: Measured comparison readiness (Phase E)

- **Date:** 2026-08-29
- **Hypothesis:** Freezing `matchKeys-v1` scoring + emitting judge-ready markdown/JSON comparison reports with explicit resource parity and live placeholders will make baseline vs Checkmate measurable as soon as API keys exist — without claiming CDR until then.
- **Change:**
  - Froze scorer policy export (`MATCH_POLICY` / `matchKeys-v1-primary-greedy`)
  - Extended `pnpm evaluate` to write `artifacts/results/comparison.{json,md}` with aggregates, parity, and `MOCK-SMOKE` | `LIVE` | `SKIPPED-NO-KEY` labels
  - Documented resource parity; committed example report format; minimal results viewer (`apps/web`); `PROVIDE_CHECKLIST.md`; video script skeleton
- **Why:** Judges need a reproducible comparison surface; live metrics must not be invented when keys are absent.
- **Metric before:** Pending real LLM baseline (Phase D) — **not fabricated**.
- **Metric after:** **SKIPPED** — `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` absent in this environment. Mock harness comparison only. Live placeholders remain `null`.
- **Decision:** **Keep** report pipeline and viewer; run live eval only after human provides keys (see `PROVIDE_CHECKLIST.md`).
- **Notes:** If keys appear later, re-run `pnpm evaluate -- --live` and replace this SKIPPED row with actual aggregates (still no fabrication).

---

## ITERATION: Product UI + submission pack (Phase G)

- **Date:** 2026-08-29
- **Hypothesis:** A calm, high-density product UI over committed sample analysis (Overview / Map / Roadmap / Proofs / Changes) plus judge-ready README/reproduction will make the verification workflow demoable without API keys — without inventing live CDR.
- **Change:**
  - Replaced thin results viewer with product UI in `apps/web` (rail nav, sample-analysis fixtures, SVG architecture map, deterministic NOW/NEXT/LATER, proof expected/observed, Change Contract stub, Eval tab)
  - `pnpm view:results` / `pnpm dev:web` serve the app offline from `apps/web/data/sample-analysis/`
  - Strengthened README (Problem → Why → Solution → Demo → Architecture → Baseline → Evaluation → Changelog/Reproduction/Trajectories/Limitations/Main failure mode/Hot take)
  - Judge-ready `REPRODUCTION.md`; `docs/HOT_TAKE.md` stub; refined video script; architecture docs for UI
- **Why:** Hackathon demo must show Understand→Guide→Prove→Protect end-to-end before keyed runs.
- **Metric before:** Pending real LLM baseline/Checkmate — **not fabricated**.
- **Metric after:** Still **pending user keys** — no live CDR invented. UI demo uses MOCK-SMOKE / sample labels only.
- **Decision:** **Keep** product UI + submission docs; run live eval only after `PROVIDE_CHECKLIST.md` is filled.
- **Notes:** Map can derive from `mental_model.json` when `engineering_map.json` is absent; sample ships a richer authored map for the IDOR case.

---

## ITERATION: Hugging Face as first-class provider

- **Date:** 2026-08-29
- **Hypothesis:** Adding Hugging Face Inference Providers (OpenAI-compatible router) as a first-class ModelProvider reduces dependency on OpenAI for reproducible live eval while keeping the same tool budgets and baseline/Checkmate parity.
- **Change:**
  - `HuggingFaceProvider` in `@checkmate/baseline` → `https://router.huggingface.co/v1` with `HF_TOKEN` / `HUGGINGFACE_API_KEY`
  - Default HF model: `Qwen/Qwen2.5-7B-Instruct` (instruction chat; not Meta-gated)
  - Primary protocol: structured JSON `tool_call`/`final` (HF-compatible mode, same as current OpenAI wiring); optional native `tools` via `CHECKMATE_HF_NATIVE_TOOLS=1`
  - `CHECKMATE_MODEL_PROVIDER=huggingface|hf`; wired in baseline + Checkmate runners; `--live` accepts HF key / `SKIPPED-NO-KEY` when missing
  - Docs: `.env.example`, `PROVIDE_CHECKLIST.md`, `REPRODUCTION.md`
- **Why:** Judges / contributors may only have HF credentials; open-weight models improve reproducibility.
- **Metric before:** Pending live CDR — **not fabricated**.
- **Metric after:** Still **pending keyed run** in this environment (no HF/OpenAI key present for live smoke). Provider wiring unit-tested; no invented CDR.
- **Decision:** **Keep** HF provider; prefer structured JSON mode for reliability across HF backends.
- **Notes:** Fairness: baseline and Checkmate share the same provider/model when HF is selected.

---

## ITERATION: Hugging Face as default provider

- **Date:** 2026-08-29
- **Hypothesis:** Making Hugging Face the default (unset) provider removes OpenAI as the primary path so live eval and docs align on one open default.
- **Change:**
  - `CHECKMATE_MODEL_PROVIDER` unset → `huggingface`; default model `Qwen/Qwen2.5-7B-Instruct`
  - OpenAI only when `CHECKMATE_MODEL_PROVIDER=openai` **and** `OPENAI_API_KEY`
  - `--live` without `HF_TOKEN` / `HUGGINGFACE_API_KEY` → `SKIPPED-NO-KEY` (OpenAI key alone does not satisfy default)
  - Mock / `--mock` still works with no keys
  - Docs + resource parity updated (HF default for baseline and Checkmate)
- **Why:** User confirmed HF should be the primary default; OpenAI remains optional secondary.
- **Metric before/after:** Still **pending keyed live run** — not fabricated.
- **Decision:** **Keep** HF as default provider.

---

## Stage: CHECKMATE (measurement)

- Status: harness + Phase E report + Phase G product UI + **HF default provider** ready; **real model metrics SKIPPED (no HF_TOKEN)**
- Next: human completes `PROVIDE_CHECKLIST.md` (HF default, or explicit OpenAI) → live eval → fill changelog metrics → hot take → video
