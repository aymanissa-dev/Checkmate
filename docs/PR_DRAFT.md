# Draft PR (for ManagePullRequest)

**Branch:** `cursor/checkmate-phase-abc-5df8`  
**Base:** `main`  
**Draft:** yes  
**Title:** Phase A–E: Checkmate eval harness, staged loop, measured comparison readiness

## Body

### Summary

Implements **Phase A–E** of Checkmate for the micro1 Agentic Workflows Hackathon (evaluation-first). Full product SaaS UI is **not** in this PR (thin results viewer only).

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

**Phase E (this iteration)**
- Frozen match policy `matchKeys-v1-primary-greedy` + documented **resource parity**
- `pnpm evaluate` emits judge-ready `artifacts/results/comparison.json` + `.md` (aggregates, live placeholders, labels)
- Labels: `MOCK-SMOKE` | `LIVE` | `SKIPPED-NO-KEY` — **no fabricated CDR**
- Committed example report format under `artifacts/results/example-comparison.*`
- Minimal results viewer: `apps/web` via `pnpm view:results`
- `PROVIDE_CHECKLIST.md` — everything the human must supply for live eval
- `docs/VIDEO_SCRIPT.md` (≤5 min skeleton)
- Sample trajectories listed for submission

### Live eval status

**SKIPPED** in this environment: `OPENAI_API_KEY` absent. Changelog metrics remain pending. After keys are provided per `PROVIDE_CHECKLIST.md`, run `pnpm evaluate -- --live`.

### Remaining

- Real LLM measured comparison (requires API keys from human)
- Anthropic provider
- Full Phase G product UI / GitHub App / Change Contract

### Gates

| Gate | Status |
|------|--------|
| A — Scorer + truth isolation on ≥2 fixtures, no LLM | Pass |
| B — Case corpus + smoke happy paths | Pass (10/10) |
| C — Baseline dry-run/mock under budget; real path wired | Pass (mock); real LLM skips without key |
| D — Checkmate mock all 10 cases, mental_model present, guard, compare smoke | Pass (mock); real metrics pending keys |
| E — Measured comparison readiness (report shape, parity, viewer, no fake metrics) | Pass (readiness); live run SKIPPED-NO-KEY |

### How to run

```bash
pnpm install
pnpm run test:fixtures
pnpm run guard:truth-isolation
pnpm run smoke:cases
pnpm evaluate                      # comparison report (MOCK-SMOKE)
pnpm view:results                  # http://127.0.0.1:4173/
# Real LLM: fill PROVIDE_CHECKLIST.md → set OPENAI_API_KEY → pnpm evaluate -- --live
```
