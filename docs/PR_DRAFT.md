# Draft PR (for ManagePullRequest)

**Branch:** `cursor/checkmate-phase-abc-5df8`  
**Base:** `main`  
**Draft:** yes  
**Title:** Phase A–G: Checkmate eval harness, staged loop, product UI, submission pack

## Body

### Summary

Implements **Phase A–G** of Checkmate for the micro1 Agentic Workflows Hackathon (evaluation-first + polished product UI). Live CDR metrics remain **pending API keys** (see `PROVIDE_CHECKLIST.md`) — not fabricated.

**Research question:** Can an evaluation-first agentic workflow (Checkmate: mental model → hypothesize → verify → report) outperform a fair one-shot senior-engineer review baseline on critical correctness/security/reliability defects — without leaking ground truth into the agent context?

### Done

**Phase A–C** — schemas, sandbox, scorer, 10 cases, fair baseline  
**Phase D** — Checkmate staged loop + artifacts + mock all 10 cases  
**Phase E** — frozen match policy, comparison reports, resource parity, checklist  

**Phase G (this iteration)**
- Product UI (`apps/web`): Overview, Map, Roadmap, Proofs, Changes, Eval
- Committed offline sample: `apps/web/data/sample-analysis/`
- `pnpm view:results` / `pnpm dev:web`
- README structured for PDF/submission; judge-ready `REPRODUCTION.md`
- Changelog stage for UI; `docs/HOT_TAKE.md` stub; refined `docs/VIDEO_SCRIPT.md`
- Change Contract stub page with before/after fixture

### Live eval status

**SKIPPED** until `OPENAI_API_KEY` provided. Changelog live metrics remain pending.

### Remaining (after keys)

- `pnpm evaluate -- --live` → fill changelog metrics + hot take
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
pnpm view:results   # http://127.0.0.1:4173/ — sample analysis works offline
```
