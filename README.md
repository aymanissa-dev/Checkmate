# Checkmate

**Research question:** Can an evaluation-first agentic workflow (Checkmate) that builds an application mental model and verifies findings outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

**Tagline:** *Your AI built it. Checkmate proves it.*

Checkmate is a submission for the **micro1 Agentic Workflows Hackathon**.

---

## Problem

AI-built apps can look finished while hiding critical defects: IDOR, JWT `alg=none`, SQL concat, SSRF, races, path traversal, forged webhooks, false-green tests, prompt/tool leaks, and eventual-consistency gaps. The bottleneck is **independent verification**, not more generation.

## Why this matters

One-shot “review this repo” agents often emit confident findings without sandbox proof. Judges and engineers need a procedure that separates **speculation** from **evidence**, and a fair baseline so improvements are measurable — not theatrical.

## Solution — Understand → Guide → Prove → Protect

| Stage | What Checkmate does |
|-------|---------------------|
| **Understand** | Scope + draft notes + `mental_model.json` (components, trust boundaries, entry points, assumptions) |
| **Guide** | Hypotheses with proposed checks; deterministic NOW / NEXT / LATER roadmap in the UI |
| **Prove** | Sandbox tools (`list_files`, `read_file`, `search`, `run_command`); proofs with `toolResultRefs`; PROVEN / DISPROVEN / INSUFFICIENT |
| **Protect** | Ship blockers from confirmed critical/high findings; Change Contract stub for before/after (later phase expands this) |

Single agent, staged state machine — not a multi-agent swarm. Same tool surface as the baseline; independent variable = **investigation procedure**.

## Demo (no API keys required)

```bash
pnpm install
pnpm view:results   # or: pnpm dev:web
# → http://127.0.0.1:4173/
```

Offline UI loads committed `apps/web/data/sample-analysis/` (Overview → Map → Roadmap → Proofs → Changes) plus Eval comparison (mock-labeled).

```bash
pnpm evaluate                 # baseline + checkmate + comparison (MOCK-SMOKE)
pnpm run test:fixtures
pnpm run guard:truth-isolation
```

## Architecture

```
cases/<id>/app  ──►  baseline (one-shot)     ──► findings + trajectory
                └──►  checkmate (staged)     ──► mental_model + proofs + findings
                              │
                              ▼
                         packages/eval (truth.json scorer-only)
                              │
                              ▼
                    artifacts/results/comparison.*
                              │
                              ▼
                         apps/web (product UI)
```

Packages: `schemas`, `sandbox`, `eval`, `baseline`, `checkmate`, `apps/web`. Details: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Baseline

Fair one-shot senior-engineer review: shared finding schema, same four tools, budget **40 tool calls / 180s**, no mental-model stage, no forced verify. Not a sabotaged agent.

## Evaluation

- **10** planted-defect mini-apps under `cases/`
- Frozen match policy `matchKeys-v1-primary-greedy`
- Labels: `MOCK-SMOKE` | `LIVE` | `SKIPPED-NO-KEY` — **no fabricated CDR**
- Live metrics: pending human API keys ([PROVIDE_CHECKLIST.md](./PROVIDE_CHECKLIST.md))

| | Baseline | Checkmate |
|---|---|---|
| Tools | list_files, read_file, search, run_command | same |
| Model (live) | `CHECKMATE_MODEL` / OpenAI or Hugging Face | same env |
| Budget | 40 / 180s | 48 / 240s (verify headroom) |

## Product UI

| View | Purpose |
|------|---------|
| **Overview** | Repo/case, analysis id, ship status, blockers, priorities, next action |
| **Map** | Architecture graph from mental model / `engineering_map.json` |
| **Roadmap** | NOW / NEXT / LATER (deterministic from severity × status) |
| **Proofs** | Claim, expected/observed, artifacts, PROVEN/DISPROVEN/INSUFFICIENT |
| **Changes** | Change Contract stub (before/after fixture) |
| **Eval** | Baseline vs Checkmate comparison table |

## Changelog

See [IMPROVEMENT_CHANGELOG.md](./IMPROVEMENT_CHANGELOG.md) — stages BASELINE → mental-model loop → measured comparison readiness → **product UI**. Live metric rows remain **pending user keys**.

## Reproduction

Judge-ready steps: [REPRODUCTION.md](./REPRODUCTION.md).

```bash
pnpm install
pnpm run test:fixtures && pnpm run guard:truth-isolation && pnpm run smoke:cases
pnpm evaluate
pnpm view:results
# Live (after keys): pnpm evaluate -- --live
```

## Trajectories

- `trajectories/sample-baseline-01-auth-idor-mock.json`
- `trajectories/sample-checkmate-01-auth-idor-mock.json`

## Limitations

- Live eval requires `OPENAI_API_KEY` or `HF_TOKEN` / `HUGGINGFACE_API_KEY` (`CHECKMATE_MODEL_PROVIDER=huggingface`); Anthropic not implemented
- Mock scores are harness smoke, not model performance
- Change Contract is a UI stub; no auto-fix / GitHub App / webhooks
- Engineering map for live runs is derived or sample-authored; LLM-authored rich maps are optional later

## Main failure mode

**Unverified confidence** — agents stating severity without sandbox evidence. Checkmate downgrades confirmations that lack `toolResultRefs`; the UI marks INSUFFICIENT distinctly from PROVEN.

## Hot take

Placeholder until live experiments: [docs/HOT_TAKE.md](./docs/HOT_TAKE.md).

## Case corpus & safety

Each case: `app/` (agent-visible), `truth.json` (scorer-only), `CASE.md`. Sandbox blocks truth access; `pnpm run guard:truth-isolation` checks leaks.

## Docs index

- [PROVIDE_CHECKLIST.md](./PROVIDE_CHECKLIST.md) — keys & checklist (user fills at end)
- [docs/VIDEO_SCRIPT.md](./docs/VIDEO_SCRIPT.md)
- [docs/HOT_TAKE.md](./docs/HOT_TAKE.md)
- [docs/PR_DRAFT.md](./docs/PR_DRAFT.md)
