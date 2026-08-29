# Video script skeleton (≤5 min)

Target length: **under 5 minutes**. Narrative order follows the hackathon brief: problem → baseline → one realistic Checkmate execution → comparison → changelog (largest change + one removed experiment).

Record after live eval if possible; until then, say clearly when footage is **mock/harness smoke**.

---

## 0:00–0:40 — Problem

- AI-built apps look finished; critical defects (IDOR, JWT `alg=none`, races, SSRF, …) are not visual.
- Bottleneck: **independent verification**, not more generation.
- Tagline: *Your AI built it. Checkmate proves it.*

**On screen:** README research question; one case app file with a subtle bug.

## 0:40–1:30 — Baseline

- Fair one-shot senior-engineer review.
- Same cases, same tools (`list_files`, `read_file`, `search`, `run_command`), same finding schema.
- Budget: 40 tool calls / 180s.
- Show a baseline trajectory snippet and findings JSON.

**Say:** “Baseline is honest — not a sabotaged agent. The independent variable is procedure.”

## 1:30–3:10 — One realistic Checkmate run

Pick **one** case (prefer `01-auth-idor` or challenging `10-challenge-eventual` / webhook case).

Walk stages quickly:

| Stage | Show |
|-------|------|
| Scope | `scope.md` |
| Understand | `draft_notes.md` |
| Model | `mental_model.json` (FACT vs ASSUMPTION) |
| Hypothesize | `hypotheses.json` |
| Verify | proof with `toolResultRefs` |
| Report | `findings.json` + `report.md` |

**Emphasize:** confirmed findings need sandbox evidence; no ground-truth leak (`truth.json` scorer-only).

## 3:10–4:10 — Comparison

- Open results viewer (`pnpm view:results`) or `artifacts/results/comparison.md`.
- Point at **label**: `LIVE` vs `MOCK-SMOKE` — never confuse them.
- Resource parity: same model env, same tools; Checkmate 48 / 240s headroom for verify.
- If live metrics exist: mean recall / per-case table. If not: say “metrics pending keys” — **do not invent CDR**.

## 4:10–4:50 — Changelog + honesty

- `IMPROVEMENT_CHANGELOG.md`: baseline → mental-model loop → Phase E readiness.
- **Largest contributing change:** staged verify-before-confirm (hypothesis; measured when live).
- **Removed / not built:** multi-agent swarm, GitHub App, fabricated leaderboard — call one out as intentional cut.

## 4:50–5:00 — Close

- Reproducibility: `REPRODUCTION.md` + `pnpm evaluate`.
- Ask: can verification procedure beat one-shot review on critical defects?

---

## B-roll checklist

- [ ] `pnpm evaluate` terminal (label visible)
- [ ] Results viewer table
- [ ] One proof JSON + trajectory tool_result
- [ ] Changelog entry
- [ ] Sample paths: `trajectories/sample-baseline-01-auth-idor-mock.json`, `trajectories/sample-checkmate-01-auth-idor-mock.json`
