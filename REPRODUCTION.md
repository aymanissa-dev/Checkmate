# Reproduction (judge-ready)

## Prerequisites

- Node.js ≥ 20
- pnpm 10.x (via `packageManager` in root `package.json`)

## Install

```bash
pnpm install
pnpm run build   # optional; scripts use tsx against sources
```

## Offline path (no API keys) — preferred for first review

```bash
pnpm run test:fixtures
pnpm run guard:truth-isolation
pnpm run smoke:cases
pnpm evaluate:baseline -- --mock
pnpm evaluate:checkmate -- --mock
pnpm evaluate                    # writes artifacts/results/comparison.{json,md}
pnpm view:results                # or: pnpm dev:web → http://127.0.0.1:4173/
```

### What you should see in the UI (offline)

1. **Overview** — sample case `01-auth-idor`, ship **blocked**, next action on F1 IDOR  
2. **Map** — clickable architecture nodes (route/service/store); detail panel with risks/files  
3. **Roadmap** — NOW / NEXT / LATER lanes  
4. **Proofs** — P1/P2 PROVEN, P3 INSUFFICIENT with expected vs observed  
5. **Changes** — Change Contract stub (before/after)  
6. **Eval** — comparison table labeled `MOCK-SMOKE` (not live CDR)

Sample artifacts: `apps/web/data/sample-analysis/`.

### Gate checklist (offline)

| Gate | Expect |
|------|--------|
| A | `test:fixtures` + truth isolation pass |
| B | `smoke:cases` happy paths |
| C | baseline `--mock` under budget |
| D | checkmate `--mock` all 10 cases; `mental_model.json` present |
| E | `comparison.json` with parity + `MOCK-SMOKE` labels; live placeholders `null` |
| G | UI serves; sample analysis navigable end-to-end |

Mock/dry-run exercises the harness. **Scores from mock mode are not model evaluation results.**

## Live LLM path (after keys)

1. Complete [PROVIDE_CHECKLIST.md](./PROVIDE_CHECKLIST.md)  
2. `cp .env.example .env` → set **either** `OPENAI_API_KEY` **or** `HF_TOKEN` / `HUGGINGFACE_API_KEY` (never commit)  
3. Optional: `CHECKMATE_MODEL` — **same model for baseline and Checkmate**
   - OpenAI default: `gpt-4o-mini`
   - Hugging Face default: `Qwen/Qwen2.5-7B-Instruct`
4. Optional: `CHECKMATE_MODEL_PROVIDER=openai` | `huggingface` | `hf`

```bash
pnpm evaluate -- --live 01-auth-idor   # subset first (auto provider from key)
pnpm evaluate -- --live                # full corpus

# Hugging Face explicitly:
CHECKMATE_MODEL_PROVIDER=huggingface pnpm evaluate -- --live 01-auth-idor

pnpm view:results
```

If `--live` is passed but **no key** for the selected provider is present: harness stays mock, labels `SKIPPED-NO-KEY`, live metric placeholders remain `null`. **Do not invent numbers.**

**HF notes:** Uses OpenAI-compatible router `https://router.huggingface.co/v1`. Agent tool loop uses structured JSON `tool_call`/`final` (same as OpenAI path here) — reliable HF-compatible mode. Token needs Inference Providers permission. Some models (e.g. Llama) require accepting a license on the model card; default Qwen avoids that.

### Resource parity

| | Baseline | Checkmate |
|---|---|---|
| Cases | same 10 | same 10 |
| Tools | list_files, read_file, search, run_command | same |
| Finding schema | shared Zod | shared |
| Model (live) | `CHECKMATE_MODEL` / OpenAI or Hugging Face | same env |
| Budget | 40 tool calls / 180s | 48 / 240s |

Independent variable = **investigation procedure** (mental model + verify).

### Expected comparison shape

See `artifacts/results/example-comparison.json`. Key fields: `mode`, `label`, `liveEvalStatus`, `matchPolicy`, `resourceParity`, `aggregates.metricsAreLive`, `livePlaceholders`, `rows[]`, `sampleTrajectories`.

## Scoring only

```bash
pnpm evaluate:score <caseId> [path/to/findings.json]
pnpm evaluate:score 01-auth-idor artifacts/01-auth-idor/checkmate-findings.json
```

## Artifact map

| Path | Meaning |
|------|---------|
| `artifacts/<caseId>/findings.json` | Baseline findings |
| `artifacts/<caseId>/checkmate-findings.json` | Checkmate findings mirror |
| `artifacts/<runId>/` | Full stage tree (`mental_model.json`, `proofs/`, …) |
| `artifacts/results/comparison.{json,md}` | Judge-ready comparison |
| `apps/web/data/sample-analysis/` | Committed UI demo bundle |
| `trajectories/sample-*-01-auth-idor-mock.json` | Submission sample traces |

## Incomplete / skipped

- Anthropic provider: not implemented  
- Real LLM CDR: **SKIPPED** until `OPENAI_API_KEY` or `HF_TOKEN` (see changelog)  
- GitHub App / auto-fix / webhooks: out of scope  
- Change Contract: UI stub only in this phase  
 
