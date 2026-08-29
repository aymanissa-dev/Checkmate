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

## Stage: CHECKMATE (planned)

- Status: not started (Phase D+)
- Metric before/after: N/A
