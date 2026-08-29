# artifacts/results

Judge-ready comparison outputs from `pnpm evaluate`.

| File | Role |
|------|------|
| `comparison.json` | Full report (mode, parity, aggregates, rows) — **generated**, gitignored |
| `comparison.md` | Same report as markdown — **generated**, gitignored |
| `example-comparison.json` | **Committed** mock-labeled shape for structure review |
| `example-comparison.md` | **Committed** mock-labeled markdown shape |

Labels you will see:

- `MOCK-SMOKE` — harness only; **not** model CDR
- `LIVE` — keyed run; actual metrics
- `SKIPPED-NO-KEY` — `--live` requested but no API key; mock ran; metrics pending

Never invent live numbers. See `PROVIDE_CHECKLIST.md`.
