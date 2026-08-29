# Hot take

**Status:** evidence from keyed live attempt (2026-08-29) — incomplete CDR.

**What we can claim from this run**

1. **Keys and wiring work.** With `HF_TOKEN` set and provider defaulting to Hugging Face, the harness selects live mode and hits the Inference Providers router — not a mock false positive.
2. **Model catalog drift matters.** The previous default `Qwen/Qwen2.5-7B-Instruct` returned `model_not_supported` on this account; `Qwen/Qwen2.5-Coder-7B-Instruct` answered a tiny chat smoke. Defaults must track what the router actually serves.
3. **Credits gate the research question.** Subset live eval (`01-auth-idor`) failed with HTTP **402** (monthly included Inference Providers credits depleted) before any findings were scored. Baseline vs Checkmate **CDR remains null** — we will not invent numbers.

**Implication for agentic code review demos:** Evaluation-first claims need a funded inference path as part of the experiment budget, not just a token. Until a scored LIVE comparison exists, product UI + mock smoke prove the procedure; they do not prove Verify-over-Generate wins on critical defects.

**Next measurement (when credits restore):** `pnpm evaluate -- --live` (prefer full 10; else ≥3–5 including a challenge) → replace null CDR with aggregates → revise this take from deltas only.
