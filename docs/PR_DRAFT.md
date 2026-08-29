# Draft PR (for ManagePullRequest)

**Branch:** `cursor/checkmate-phase-abc-5df8`  
**Base:** `main`  
**Draft:** yes  
**Title:** Phase A–D: Checkmate eval harness, 10 cases, baseline + staged verification loop

## Body

### Summary

Implements **Phase A–D** of Checkmate for the micro1 Agentic Workflows Hackathon (evaluation-first). Product UI is **not** in this PR (Phase G later).

**Research question:** Can an evaluation-first agentic workflow (Checkmate: mental model → hypothesize → verify → report) outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

### Done

**Phase A–C**
- Shared Zod contracts (`schemaVersion: 1`) for ApplicationMentalModel, Finding, Proof, EvaluationCase/truth, Trajectory
- Sandbox tools: `list_files`, `read_file`, `search`, `run_command`
- Deterministic scorer + truth-isolation guard
- **10** evaluation mini-apps under `cases/`
- Fair one-shot baseline runner (OpenAI + mock)

**Phase D**
- Checkmate single-agent staged loop: scope → understand → model → hypothesize → verify → report
- Artifacts under `artifacts/<runId>/` (`mental_model.json`, `hypotheses.json`, `proofs/*`, `findings.json`, `report.md`)
- Confirmed findings require proof `toolResultRefs` to real tool_result steps
- `pnpm evaluate:checkmate -- --mock` completes all 10 cases under budget
- `pnpm evaluate` runs baseline + checkmate + comparison table (labeled MOCK-SMOKE)
- Sample trajectories under `trajectories/sample-*.json`
- Changelog ITERATION entry with metrics **pending real LLM run** (no invented numbers)

### Remaining

- Real LLM measured comparison (requires API keys; not fabricated)
- Anthropic provider
- Phase G product UI / GitHub App / Change Contract

### Gates

| Gate | Status |
|------|--------|
| A — Scorer + truth isolation on ≥2 fixtures, no LLM | Pass |
| B — Case corpus + smoke happy paths | Pass (10/10) |
| C — Baseline dry-run/mock under budget; real path wired | Pass (mock); real LLM skips without key |
| D — Checkmate mock all 10 cases, mental_model present, guard, compare smoke | Pass (mock); real metrics pending keys |

### How to run

```bash
pnpm install
pnpm run test:fixtures
pnpm run guard:truth-isolation
pnpm run smoke:cases
pnpm evaluate:baseline -- --mock
pnpm evaluate:checkmate -- --mock
pnpm evaluate                      # comparison table (MOCK-SMOKE only)
# Real LLM: set OPENAI_API_KEY then pnpm evaluate:checkmate -- 01-auth-idor
```
