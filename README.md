# Checkmate

**Research question:** Can an evaluation-first agentic workflow (Checkmate) that builds an application mental model and verifies findings outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

Checkmate is a hackathon project for the **micro1 Agentic Workflows Hackathon**. This repo prioritizes **evaluation contracts, case corpus, and a fair baseline** before any advanced agent UI.

## Who this is for

- Hackathon judges / reviewers evaluating agentic code-review workflows
- Engineers comparing baseline vs Checkmate on planted critical defects

## What's in the repo (Phase A–C)

| Area | Status |
|------|--------|
| Shared Zod contracts (`packages/schemas`) | Done |
| Sandboxed tools (`packages/sandbox`) | Done |
| Deterministic scorer (`packages/eval`) | Done |
| 10 mini-app evaluation cases (`cases/`) | Done |
| Fair one-shot baseline runner (`packages/baseline`) | Done |
| Checkmate advanced loop (`packages/checkmate`) | Stub only (Phase D+) |

## Quick start

```bash
pnpm install
pnpm run test:fixtures          # Gate A: score hand-written findings (no LLM)
pnpm run guard:truth-isolation  # ensure no truth leaks into agent paths
pnpm run smoke:cases            # happy-path smokes for case apps
pnpm evaluate:baseline -- --mock   # dry-run baseline (fixture provider; NOT real model eval)
pnpm evaluate:score 01-auth-idor cases/01-auth-idor/fixtures/sample-findings.json
```

### Real LLM baseline (optional)

```bash
cp .env.example .env
# set OPENAI_API_KEY
pnpm evaluate:baseline -- 01-auth-idor
```

Without an API key, baseline defaults to **mock/dry-run**. Mock scores are harness smoke only — **not** model performance. Do not treat them as evaluation results.

### Checkmate agent

```bash
pnpm evaluate:checkmate   # intentionally fails: Phase D+ not implemented
```

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
