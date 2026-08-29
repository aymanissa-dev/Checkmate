# Checkmate

**Research question:** Can an evaluation-first agentic workflow (Checkmate) that builds an application mental model and verifies findings outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

Checkmate is a hackathon project for the **micro1 Agentic Workflows Hackathon**. This repo prioritizes **evaluation contracts, case corpus, fair baseline, and the Checkmate staged verification loop** before any product UI.

## Who this is for

- Hackathon judges / reviewers evaluating agentic code-review workflows
- Engineers comparing baseline vs Checkmate on planted critical defects

## What's in the repo (Phase A–D)

| Area | Status |
|------|--------|
| Shared Zod contracts (`packages/schemas`) | Done |
| Sandboxed tools (`packages/sandbox`) | Done |
| Deterministic scorer (`packages/eval`) | Done |
| 10 mini-app evaluation cases (`cases/`) | Done |
| Fair one-shot baseline runner (`packages/baseline`) | Done |
| Checkmate staged loop (`packages/checkmate`) | Done (Phase D) |
| Product web UI | Not this phase (Phase G) |

## Quick start

```bash
pnpm install
pnpm run test:fixtures          # Gate A: score hand-written findings (no LLM)
pnpm run guard:truth-isolation  # ensure no truth leaks into agent paths
pnpm run smoke:cases            # happy-path smokes for case apps
pnpm evaluate:baseline -- --mock      # dry-run baseline (NOT real model eval)
pnpm evaluate:checkmate -- --mock     # dry-run Checkmate staged loop (NOT real model eval)
pnpm evaluate                         # baseline + checkmate + comparison table (mock)
pnpm evaluate:score 01-auth-idor cases/01-auth-idor/fixtures/sample-findings.json
```

### Real LLM runs (optional)

```bash
cp .env.example .env
# set OPENAI_API_KEY
pnpm evaluate:baseline -- 01-auth-idor
pnpm evaluate:checkmate -- 01-auth-idor
pnpm evaluate:compare -- --live   # only with keys; still label incomplete runs honestly
```

Without an API key, runners default to **mock/dry-run**. Mock scores are harness smoke only — **not** model performance.

## Checkmate stages (single agent)

| Stage | Artifact |
|-------|----------|
| 0 Scope | `scope.md` |
| 1 Understand | `draft_notes.md` |
| 2 Model | `mental_model.json` |
| 3 Hypothesize | `hypotheses.json` |
| 4 Verify | `proofs/*` (sandbox checks) |
| 5 Report | `findings.json` + `report.md` |

Artifacts land under `artifacts/<runId>/` with mirrors under `artifacts/<caseId>/` for scoring. Same tool surface as baseline: `list_files`, `read_file`, `search`, `run_command`. Confirmed findings must cite `toolResultRefs`; otherwise they are downgraded to unverified.

## Case corpus

Each case lives under `cases/<id>/`:

- `app/` — agent-visible mini-app (Node, dependency-light)
- `truth.json` — **scorer-only** ground truth (never in agent workspace)
- `CASE.md` — author notes
- optional `fixtures/sample-findings.json` — hand-written findings for scorer tests

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md), [REPRODUCTION.md](./REPRODUCTION.md), and [IMPROVEMENT_CHANGELOG.md](./IMPROVEMENT_CHANGELOG.md).

## Safety

- Ground truth is isolated from agent tool roots (`cases/<id>/app` only).
- Sandbox blocks `truth.json` access and path escape.
- `pnpm run guard:truth-isolation` checks trajectories/artifacts/apps for leak patterns.
