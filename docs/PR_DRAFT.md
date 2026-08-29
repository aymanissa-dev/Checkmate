# Draft PR (for ManagePullRequest)

**Branch:** `cursor/checkmate-phase-abc-5df8`  
**Base:** `main`  
**Draft:** yes  
**Title:** Phase A–G + HF default provider: Checkmate eval harness, staged loop, product UI

**Create URL (ManagePullRequest unavailable in this agent):**  
https://github.com/aymanissa-dev/Checkmate/compare/main...cursor/checkmate-phase-abc-5df8?expand=1  
Note: PRs #5–#7 on this branch are **MERGED**; open a **new** draft PR from this branch for the live-eval attempt docs + Coder-7B default.

## Body

### Summary

Implements **Phase A–G** of Checkmate for the micro1 Agentic Workflows Hackathon (evaluation-first + polished product UI), with **Hugging Face as the default model provider** (`CHECKMATE_MODEL_PROVIDER` unset → `huggingface`, model `Qwen/Qwen2.5-Coder-7B-Instruct`). OpenAI is optional secondary (`CHECKMATE_MODEL_PROVIDER=openai` + `OPENAI_API_KEY`). Live CDR remains **blocked** after a keyed attempt (HF Inference Providers **402 credits depleted**; no scored LIVE rows — not fabricated).

**Research question:** Can an evaluation-first agentic workflow (Checkmate: mental model → hypothesize → verify → report) outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

### Done

**Phase A–C** — schemas, sandbox, scorer, 10 cases, fair baseline  
**Phase D** — Checkmate staged loop + artifacts + mock all 10 cases  
**Phase E** — frozen match policy, comparison reports, resource parity, checklist  

**Phase G**
- Product UI (`apps/web`): Overview, Map, Roadmap, Proofs, Changes, Eval
- Committed offline sample: `apps/web/data/sample-analysis/`
- `pnpm view:results` / `pnpm dev:web`
- README structured for PDF/submission; judge-ready `REPRODUCTION.md`

**Hugging Face = default provider**
- `HuggingFaceProvider` via OpenAI-compatible router `https://router.huggingface.co/v1`
- Unset `CHECKMATE_MODEL_PROVIDER` → `huggingface`; default model `Qwen/Qwen2.5-Coder-7B-Instruct`
- Env: `HF_TOKEN` / `HUGGINGFACE_API_KEY` for live; OpenAI only when explicitly selected
- Same structured JSON tool loop; baseline + Checkmate share provider/model (resource parity)
- `--live` without HF token → `SKIPPED-NO-KEY`; mock mode needs no keys

### Live eval status

**Keyed attempt ran.** Auth OK. Default model updated to `Qwen/Qwen2.5-Coder-7B-Instruct` after `Qwen/Qwen2.5-7B-Instruct` → `model_not_supported`. Subset `01-auth-idor` → **ERROR 402** (HF monthly Inference Providers credits depleted). `casesScored: 0`; CDR aggregates **null**. See `IMPROVEMENT_CHANGELOG.md` / `docs/HOT_TAKE.md`.

### Remaining (after credits)

- Restore HF Inference Providers credits (or PRO / pre-paid) → `pnpm evaluate -- --live`
- Fill changelog CDR + revise hot take from scored rows only
- Optional: `CHECKMATE_MODEL_PROVIDER=openai` path
- Optional video recording per `docs/VIDEO_SCRIPT.md`
- Anthropic provider (optional)

### Explicitly not in scope

GitHub App, webhooks, auto-fix, multi-agent swarm, Kafka/Redis/K8s

### How to run

```bash
pnpm install
pnpm run test:fixtures
pnpm run guard:truth-isolation
pnpm evaluate
# HF live (default after HF_TOKEN in .env):
# pnpm evaluate -- --live 01-auth-idor
pnpm view:results   # http://127.0.0.1:4173/ — sample analysis works offline
```
