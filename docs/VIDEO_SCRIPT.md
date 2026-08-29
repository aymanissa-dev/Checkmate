# Video script (≤5 min)

Target length: **under 5 minutes**. Order: problem → baseline → one Checkmate execution → **product UI** → comparison → changelog honesty.

Record after live eval if possible; until then, say clearly when footage is **mock/harness smoke** or **committed sample analysis**.

---

## 0:00–0:35 — Problem

- AI-built apps look finished; critical defects are not visual.
- Bottleneck: **independent verification**, not more generation.
- Tagline: *Your AI built it. Checkmate proves it.*

**On screen:** README research question; `cases/01-auth-idor/app/src/server.js` `getOrder` ignoring uid.

## 0:35–1:15 — Baseline

- Fair one-shot senior-engineer review.
- Same tools and finding schema; budget 40 / 180s.
- Show baseline trajectory snippet.

**Say:** “Baseline is honest. The independent variable is procedure.”

## 1:15–2:40 — One Checkmate run

Case: **01-auth-idor** (sample or live).

| Stage | Show |
|-------|------|
| Scope / Understand | `scope.md`, `draft_notes.md` |
| Model | `mental_model.json` |
| Hypothesize | `hypotheses.json` |
| Verify | proof with `toolResultRefs` |
| Report | `findings.json` |

**Emphasize:** confirmed needs evidence; `truth.json` never in agent context.

## 2:40–3:40 — Product UI walk

`pnpm view:results` → http://127.0.0.1:4173/

1. **Overview** — ship blocked, next best action  
2. **Map** — click IDOR route node → risks/files  
3. **Roadmap** — NOW / NEXT / LATER  
4. **Proofs** — expected vs observed; PROVEN vs INSUFFICIENT  

**Say:** “This is the engineering product surface — not a chat log.”

## 3:40–4:25 — Comparison

- **Eval** tab or `artifacts/results/comparison.md`
- Label: `LIVE` vs `MOCK-SMOKE` — never confuse them
- Resource parity; if no keys: “metrics pending” — **do not invent CDR**

## 4:25–4:50 — Changelog + cuts

- `IMPROVEMENT_CHANGELOG.md`: baseline → verify loop → comparison readiness → product UI
- Largest bet: verify-before-confirm
- Intentional cut: multi-agent swarm / GitHub App / fabricated leaderboard

## 4:50–5:00 — Close

- `REPRODUCTION.md` + offline demo without keys
- Ask: can verification procedure beat one-shot review on critical defects?

---

## B-roll checklist

- [ ] `pnpm evaluate` terminal (label visible)
- [ ] UI: Overview → Map → Roadmap → Proofs
- [ ] One proof JSON + trajectory tool_result
- [ ] Changelog entry (live metrics pending)
- [ ] Sample trajectories paths
