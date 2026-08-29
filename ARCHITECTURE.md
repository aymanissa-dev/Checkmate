# Architecture

## Research framing

Compare a **fair one-shot baseline** (senior engineer review + shared tools + budget) against **Checkmate** (scope → understand → model → hypothesize → verify → report) on planted critical defects.

## Packages

```
packages/
  schemas/    # Zod contracts (schemaVersion: 1)
  sandbox/    # list_files, read_file, search, run_command
  eval/       # deterministic scorer (matchKeys-v1 frozen) + resource parity
  baseline/   # one-shot runner + model provider abstraction
  checkmate/  # staged mental-model + verification loop
apps/
  web/        # product UI (Overview, Map, Roadmap, Proofs, Changes, Eval)
```

## Case layout

```
cases/<id>/
  app/           # agent-visible only
  truth.json     # scorer-only
  CASE.md
  fixtures/      # optional hand-scored findings
```

## Data flow

1. Runner mounts sandbox on `cases/<id>/app`
2. Agent uses tools under budget → writes findings + trajectory
3. Scorer loads `truth.json` + findings → score JSON

### Baseline

- Artifacts: `artifacts/<caseId>/findings.json`, `trajectories/baseline-*.json`
- No mental-model or forced verify stage

### Checkmate

- Artifacts: `artifacts/<runId>/` containing `scope.md`, `draft_notes.md`, `mental_model.json`, `hypotheses.json`, `proofs/`, `findings.json`, `report.md`, `trajectory.json`
- Mirrors: `artifacts/<caseId>/checkmate-findings.json`, `mental_model.json`, `checkmate-score.json`
- Same tools as baseline; budget comparable (48 tool calls / 240s vs baseline 40 / 180s)
- Confirmed findings require proof `toolResultRefs` pointing at real trajectory tool_result steps

## Product UI (`apps/web`)

Static app (no framework). `pnpm view:results` / `pnpm dev:web` → `http://127.0.0.1:4173/`.

| View | Data |
|------|------|
| Overview | manifest + findings + mental model → ship status / blockers / next action |
| Map | `engineering_map.json` or derived from `mental_model.json` (SVG, no heavy deps) |
| Roadmap | Deterministic NOW/NEXT/LATER from severity × verificationStatus |
| Proofs | proofs.json (claim, expected, observed, result) |
| Changes | `change_contract.stub.json` placeholder |
| Eval | `data/comparison.json` (synced from `artifacts/results/` when present) |

Offline demo bundle: `apps/web/data/sample-analysis/`.

## Model providers

- **mock** — fixture / staged dry-run for CI (not model performance)
- **openai** — Chat Completions when `OPENAI_API_KEY` is set
- Anthropic — not implemented yet

## Comparison reports

- `pnpm evaluate` → `artifacts/results/comparison.{json,md}`
- Labels: `MOCK-SMOKE` | `LIVE` | `SKIPPED-NO-KEY`
- Human inputs: `PROVIDE_CHECKLIST.md`

## Non-goals (current phase)

- GitHub App / webhooks / auto-fix
- Multi-agent swarm theater
- Fabricated leaderboard metrics without keyed LLM runs
- Kafka / Redis / K8s
