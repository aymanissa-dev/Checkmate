# Architecture (skeleton)

## Research framing

Compare a **fair one-shot baseline** (senior engineer review + shared tools + budget) against **Checkmate** (mental model → investigate → verify → report) on planted critical defects.

## Packages

```
packages/
  schemas/    # Zod contracts (schemaVersion: 1)
  sandbox/    # list_files, read_file, search, run_command
  eval/       # deterministic scorer (no LLM)
  baseline/   # Phase C one-shot runner + model provider abstraction
  checkmate/  # Phase D+ stub
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
2. Agent uses tools under budget → writes `artifacts/<id>/findings.json` + trajectory
3. Scorer loads `truth.json` + findings → `artifacts/<id>/score.json`

## Non-goals (this phase)

- Full Checkmate advanced UI / multi-stage loop
- Fabricated leaderboard metrics
- Shipping API keys or live provider credentials
