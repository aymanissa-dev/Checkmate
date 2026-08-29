# Draft PR (for ManagePullRequest)

**Branch:** `cursor/checkmate-phase-abc-5df8`  
**Base:** `main`  
**Draft:** yes  
**Title:** Phase A–C: Checkmate eval contracts, 10 cases, baseline harness

## Body

### Summary

Implements **Phase A–C** of Checkmate for the micro1 Agentic Workflows Hackathon (evaluation-first). Full Checkmate advanced agent UI is **not** in this PR (Phase D+ stub only).

**Research question:** Can an evaluation-first agentic workflow (Checkmate: mental model → investigate → verify → report) outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

### Done (Phase A–C)

- Shared Zod contracts (`schemaVersion: 1`) for ApplicationMentalModel, Finding, Proof, EvaluationCase/truth, Trajectory
- Sandbox tools: `list_files`, `read_file`, `search`, `run_command` (cwd restriction, timeouts, truth denial)
- Deterministic scorer (no LLM) + truth-isolation guard
- **10** evaluation mini-apps under `cases/` with `truth.json` (scorer-only)
- Fair one-shot baseline runner with budgets, OpenAI provider wiring, and **mock/dry-run** for CI
- Sample mock trajectory: `trajectories/sample-baseline-01-auth-idor-mock.json`
- Docs: README, ARCHITECTURE, REPRODUCTION, IMPROVEMENT_CHANGELOG (BASELINE stage; no invented metrics)

### Remaining (Phase D+)

- Checkmate advanced loop (mental model + forced verify)
- Real LLM baseline measurement numbers (requires API keys; not fabricated)
- Anthropic provider (OpenAI + mock only for now)

### Gates

| Gate | Status |
|------|--------|
| A — Scorer + truth isolation on ≥2 fixtures, no LLM | Pass |
| B — Case corpus + smoke happy paths | Pass (10/10) |
| C — Baseline dry-run/mock under budget; real path wired | Pass (mock); real LLM skips without key |

### How to run

```bash
pnpm install
pnpm run test:fixtures
pnpm run guard:truth-isolation
pnpm run smoke:cases
pnpm evaluate:baseline -- --mock   # NOT a real model eval
# Real LLM: set OPENAI_API_KEY then pnpm evaluate:baseline
pnpm evaluate:checkmate            # stub — fails clearly until Phase D
```
