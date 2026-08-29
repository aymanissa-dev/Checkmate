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
pnpm evaluate:checkmate -- --mock
pnpm evaluate                    # baseline + checkmate + comparison table (mock)
```

Mock/dry-run exercises the harness and Checkmate stages. **Scores from mock mode are not model evaluation results.**

### Gate D checks

- Checkmate completes all 10 cases in mock mode under budget
- `mental_model.json` present per case run
- Truth-isolation guard passes on trajectories
- Comparison table generates with `MOCK-SMOKE` labels

## Real LLM baseline / Checkmate

1. Copy `.env.example` → `.env`
2. Set `OPENAI_API_KEY` (never commit secrets)
3. Optionally set `CHECKMATE_MODEL` (default `gpt-4o-mini`)
4. Run:

```bash
pnpm evaluate:baseline -- 01-auth-idor
pnpm evaluate:checkmate -- 01-auth-idor
# or all cases + table:
pnpm evaluate:compare -- --live
```

If no key is present, runners fall back to mock and label output accordingly.

## Scoring only

```bash
pnpm evaluate:score <caseId> [path/to/findings.json]
# Checkmate findings mirror:
pnpm evaluate:score 01-auth-idor artifacts/01-auth-idor/checkmate-findings.json
```

## Artifacts

- `artifacts/<caseId>/findings.json` — baseline findings (gitignored)
- `artifacts/<caseId>/checkmate-findings.json` — latest Checkmate findings mirror
- `artifacts/<runId>/` — full Checkmate stage tree
- `artifacts/<caseId>/score.json` / `checkmate-score.json`
- `artifacts/comparison-table.json` — from `pnpm evaluate`
- `trajectories/*.json` — run traces (samples committed for demo)

## Incomplete / skipped paths

- Anthropic provider: not implemented; use OpenAI or mock
- Real LLM evaluation metrics: **not reported here** until keyed runs are completed
- Product UI (Phase G): not started
