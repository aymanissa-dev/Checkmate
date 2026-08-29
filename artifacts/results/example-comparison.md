# Checkmate comparison report

- **Generated:** 2026-08-29T12:00:00.000Z
- **Mode:** `mock`
- **Label:** **MOCK-SMOKE**
- **Live eval status:** mock-only
- **Match policy:** `matchKeys-v1-primary-greedy` (frozen)
- **Disclaimer:** MOCK harness smoke — not real model evaluation metrics. Do not cite as CDR / model improvements.

## Resource parity

| Side | maxToolCalls | maxWallTimeMs | tools |
|---|---:|---:|---|
| Baseline | 40 | 180000 | list_files, read_file, search, run_command |
| Checkmate | 48 | 240000 | same |

Default model (live): `gpt-4o-mini` via `CHECKMATE_MODEL` / OpenAI. Requested this run: `gpt-4o-mini`.

- Checkmate adds mental-model + hypothesize + verify stages (procedure).
- Checkmate tool/time budget is slightly higher to allow sandbox proofs.
- Same provider/model env when live; mock mode is harness smoke only.

## Aggregates

> **Metrics below are NOT live model CDR.** Placeholders / mock-smoke only.

| Metric | Baseline | Checkmate | Delta |
|---|---:|---:|---:|
| Mean recall | 1.000 | 1.000 | +0.000 |
| Mean precision | 1.000 | 1.000 | — |
| TP (sum) | 10 | 10 | — |
| FN (sum) | 0 | 0 | — |
| FP (sum) | 0 | 0 | — |
| Cases scored | 10 / 10 | | errors: 0 |

## Live metric placeholders

Filled only after a keyed live run. Until then these stay `null` — never invent numbers.

```json
{
  "note": "Pending OPENAI_API_KEY (or confirmed provider) + pnpm evaluate -- --live",
  "criticalDefectRecall_baseline": null,
  "criticalDefectRecall_checkmate": null,
  "precision_baseline": null,
  "precision_checkmate": null,
  "costEstimateUsd": null,
  "wallTimeTotalMs": null
}
```

## Per-case table

| caseId | b_TP | b_FN | b_rec | b_prec | c_TP | c_FN | c_rec | c_prec | Δrec | label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01-auth-idor | 1 | 0 | 1.00 | 1.00 | 1 | 0 | 1.00 | 1.00 | +0.00 | MOCK-SMOKE |
| … | … | … | … | … | … | … | … | … | … | MOCK-SMOKE |

(Full ten rows appear in a real `pnpm evaluate` run.)

## Sample trajectories (submission)

- `trajectories/sample-baseline-01-auth-idor-mock.json`
- `trajectories/sample-checkmate-01-auth-idor-mock.json`

## Viewer

Open apps/web/index.html via `pnpm view:results` (serves comparison JSON).
