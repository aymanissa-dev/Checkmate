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

## Stage: CHECKMATE (measurement)

- Status: harness ready; **real model metrics pending API keys**
- Next: Phase E measured comparison on live providers; Phase G UI later
