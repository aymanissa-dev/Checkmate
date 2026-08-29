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
pnpm evaluate                    # baseline + checkmate + comparison report (mock)
pnpm view:results                # http://127.0.0.1:4173/
```

Mock/dry-run exercises the harness and Checkmate stages. **Scores from mock mode are not model evaluation results.**

### Gate D checks

- Checkmate completes all 10 cases in mock mode under budget
- `mental_model.json` present per case run
- Truth-isolation guard passes on trajectories
- Comparison report generates with `MOCK-SMOKE` labels

### Gate E checks (measured comparison readiness)

- Scorer match policy frozen as `matchKeys-v1-primary-greedy` (see `packages/eval/src/match-policy.ts`)
- `pnpm evaluate` writes judge-ready `artifacts/results/comparison.json` + `comparison.md`
- Report includes `resourceParity`, `livePlaceholders`, and clear `MOCK-SMOKE` / `LIVE` / `SKIPPED-NO-KEY` labels
- Committed example shape: `artifacts/results/example-comparison.*`
- Live eval **ran** only if `OPENAI_API_KEY` present; otherwise **SKIPPED** (no invented CDR)

## Real LLM baseline / Checkmate (live)

1. Copy `.env.example` → `.env`
2. Set `OPENAI_API_KEY` (never commit secrets) — see [PROVIDE_CHECKLIST.md](./PROVIDE_CHECKLIST.md)
3. Optionally set `CHECKMATE_MODEL` (default `gpt-4o-mini`) — **same model for baseline and Checkmate**
4. Run:

```bash
# single case first (recommended)
pnpm evaluate -- --live 01-auth-idor

# full corpus
pnpm evaluate -- --live

# viewer
pnpm view:results
```

Equivalent split commands:

```bash
pnpm evaluate:baseline -- 01-auth-idor
pnpm evaluate:checkmate -- 01-auth-idor
pnpm evaluate:compare -- --live
```

If `--live` is passed but **no key** is present, the harness runs mock, labels rows `SKIPPED-NO-KEY`, and leaves live metric placeholders as `null`. **Do not invent numbers.**

### Resource parity (fair comparison)

| | Baseline | Checkmate |
|---|---|---|
| Cases | same 10 | same 10 |
| Tools | list_files, read_file, search, run_command | same |
| Finding schema | shared Zod | shared Zod |
| Model (live) | `CHECKMATE_MODEL` / OpenAI | same env |
| Budget | 40 tool calls / 180s | 48 / 240s (verify headroom) |

Independent variable = **investigation procedure** (mental model + verify), not tool access or model family.

### Expected output shape (`artifacts/results/comparison.json`)

```json
{
  "schemaVersion": 1,
  "mode": "mock | live | skipped-no-key",
  "label": "MOCK-SMOKE | LIVE | SKIPPED-NO-KEY",
  "liveEvalStatus": "mock-only | ran | skipped-no-key",
  "matchPolicy": { "id": "matchKeys-v1-primary-greedy" },
  "resourceParity": { "...": "..." },
  "aggregates": {
    "metricsAreLive": false,
    "baseline": { "meanRecall": null },
    "checkmate": { "meanRecall": null },
    "deltaMeanRecall": null
  },
  "livePlaceholders": {
    "criticalDefectRecall_baseline": null,
    "criticalDefectRecall_checkmate": null
  },
  "rows": [ { "caseId": "...", "label": "...", "baseline": {}, "checkmate": {} } ],
  "sampleTrajectories": [
    "trajectories/sample-baseline-01-auth-idor-mock.json",
    "trajectories/sample-checkmate-01-auth-idor-mock.json"
  ]
}
```

Markdown twin: `artifacts/results/comparison.md`. Viewer loads the JSON via `pnpm view:results`.

## Scoring only

```bash
pnpm evaluate:score <caseId> [path/to/findings.json]
# Checkmate findings mirror:
pnpm evaluate:score 01-auth-idor artifacts/01-auth-idor/checkmate-findings.json
```

## Artifacts

- `artifacts/<caseId>/findings.json` — baseline findings (gitignored)
- `artifacts/<caseId>/checkmate-findings.json` — latest Checkmate findings mirror
- `artifacts/<runId>/` — full Checkmate stage tree (`mental_model.json`, `proofs/`, …)
- `artifacts/<caseId>/score.json` / `checkmate-score.json`
- `artifacts/results/comparison.json` + `comparison.md` — Phase E judge-ready report
- `artifacts/results/example-comparison.*` — committed report format (mock-labeled)
- `trajectories/*.json` — run traces
- **Submission samples (committed):**
  - `trajectories/sample-baseline-01-auth-idor-mock.json`
  - `trajectories/sample-checkmate-01-auth-idor-mock.json`

## Incomplete / skipped paths

- Anthropic provider: not implemented; use OpenAI or mock
- Real LLM evaluation metrics: **SKIPPED** until `OPENAI_API_KEY` is provided (see changelog)
- Full product SaaS UI / GitHub App: not this phase (thin results viewer only)
