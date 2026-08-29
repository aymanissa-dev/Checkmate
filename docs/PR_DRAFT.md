# Draft PR (for ManagePullRequest)

**Branch:** `cursor/checkmate-phase-abc-5df8`  
**Base:** `main`  
**Draft:** yes  
**Title:** Phase A–G + Hugging Face provider: Checkmate eval harness, staged loop, product UI

**Create URL (ManagePullRequest unavailable in this agent):**  
https://github.com/aymanissa-dev/Checkmate/compare/main...cursor/checkmate-phase-abc-5df8?expand=1  
Note: prior PR #5 (Phase E) is **MERGED**; open a **new** draft PR from this branch for Phase G + HF provider.

## Body

### Summary

Implements **Phase A–G** of Checkmate for the micro1 Agentic Workflows Hackathon (evaluation-first + polished product UI), plus **Hugging Face as a first-class model provider** so live eval can run with `HF_TOKEN` instead of (or in addition to) OpenAI. Live CDR metrics remain **pending API keys** (see `PROVIDE_CHECKLIST.md`) — not fabricated.

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

**Hugging Face provider**
- `HuggingFaceProvider` via OpenAI-compatible router `https://router.huggingface.co/v1`
- Env: `HF_TOKEN` / `HUGGINGFACE_API_KEY`, `CHECKMATE_MODEL_PROVIDER=huggingface`, default model `Qwen/Qwen2.5-7B-Instruct`
- Same structured JSON tool loop as OpenAI path (HF-compatible mode); baseline + Checkmate share provider
- `--live` → `SKIPPED-NO-KEY` when HF selected but token missing

### Live eval status

**SKIPPED** until `OPENAI_API_KEY` or `HF_TOKEN` provided. Changelog live metrics remain pending.

### Remaining (after keys)

- `CHECKMATE_MODEL_PROVIDER=huggingface pnpm evaluate -- --live` (or OpenAI) → fill changelog metrics + hot take
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
# HF live (after key):
# CHECKMATE_MODEL_PROVIDER=huggingface pnpm evaluate -- --live 01-auth-idor
pnpm view:results   # http://127.0.0.1:4173/ — sample analysis works offline
```
