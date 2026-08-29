# Reproduction

## Prerequisites

- Node.js ≥ 20
- pnpm 10.x (via `packageManager` field)

## Install

```bash
pnpm install
pnpm run build   # optional; scripts use tsx against sources
```

## Offline / CI (no API keys)

```bash
pnpm run test:fixtures
pnpm run guard:truth-isolation
pnpm run smoke:cases
pnpm evaluate:baseline -- --mock
```

Mock/dry-run uses a fixture provider to exercise the harness. **Scores from mock mode are not model evaluation results.**

## Real LLM baseline

1. Copy `.env.example` → `.env`
2. Set `OPENAI_API_KEY` (never commit secrets)
3. Optionally set `CHECKMATE_MODEL` (default `gpt-4o-mini`)
4. Run:

```bash
pnpm evaluate:baseline -- 01-auth-idor
# or all cases:
pnpm evaluate:baseline
```

If no key is present, the runner falls back to mock and labels output accordingly.

## Scoring only

```bash
pnpm evaluate:score <caseId> [path/to/findings.json]
```

## Checkmate

```bash
pnpm evaluate:checkmate
```

Expected: clear failure — advanced agent not implemented (Phase D+).

## Artifacts

- `artifacts/<caseId>/findings.json` — produced findings (gitignored)
- `artifacts/<caseId>/score.json` — scorer output (gitignored)
- `trajectories/*.json` — run traces (sample committed for demo)

## Incomplete / skipped paths

- Anthropic provider: not implemented; use OpenAI or mock
- Real LLM evaluation metrics: **not reported here** until keyed runs are completed
- Checkmate agent metrics: **N/A** until Phase D+
