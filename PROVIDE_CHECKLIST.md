# Provide checklist (human)

Everything **you** must supply before we can run **live** evaluation and review the full submission package together. Checkbox-style, ordered by priority.

Copy this file or reply with the filled items. Secrets go in **`.env` only** (never commit).

---

## Must-have for live metrics

- [ ] **Model API key** — set in `.env` (gitignored):
  - `OPENAI_API_KEY=...` (**required** for current live path)
  - Optional later: `ANTHROPIC_API_KEY=...` (provider **not implemented** yet; do not rely on it)
  - Template: copy `.env.example` → `.env`
- [ ] **Model choice** — confirm or override default:
  - Default: `gpt-4o-mini` via `CHECKMATE_MODEL`
  - If you want another OpenAI chat model, set `CHECKMATE_MODEL=<name>`
  - Leave `CHECKMATE_MODEL_PROVIDER` unset (or `openai`) for live; `mock` forces dry-run
- [ ] **Case scope for first live run** — pick one:
  - [ ] Subset first (recommended): e.g. `01-auth-idor` then `07-webhook-forge`
  - [ ] All **10** cases in one pass
- [ ] **Budget / cost preferences** (optional but useful):
  - [ ] Max cases this session: `___`
  - [ ] Soft cost cap (USD): `___` (we stop / shrink scope if you set one)
  - [ ] No preference — use defaults (baseline 40 tools / 180s; Checkmate 48 / 240s; same model)
- [ ] **Sandbox execution consent** — confirm you accept that agents run allowlisted shell commands **inside** each `cases/<id>/app` sandbox (no auto-fix / no PR comments):
  - [ ] Yes, sandboxed case execution is OK

## Should / optional for submission polish

- [ ] **Demo recording preference**
  - [ ] Screen-record from this repo’s cases + results viewer only
  - [ ] Also demo an external sample app (provide path/URL): `___`
- [ ] **Hot take** (`docs/HOT_TAKE.md` later)
  - [ ] You will draft it
  - [ ] Derive from live results / failures after keyed eval
- [ ] **GitHub token** (optional / SHOULD) — only if you want private-repo clone polish later:
  - `GITHUB_TOKEN` or `GH_TOKEN` in `.env` — **not required** for eval or viewer
- [ ] **micro1 / HackerEarth identity & submission fields** (optional notes)
  - Confirm login-gated Submission Package extras (video URL, zip, checklist) on HackerEarth
  - Team / display name as you will submit: `___`
  - Any required links beyond the public GitHub repo: `___`

## Blocking live eval or viewing (check if anything else)

- [ ] Nothing else blocking
- [ ] Other blocker: `___`

---

## After you provide these

We will run (exact commands):

```bash
cp .env.example .env   # if not done; paste OPENAI_API_KEY
# optional: CHECKMATE_MODEL=gpt-4o-mini

# subset first (example):
pnpm evaluate -- --live 01-auth-idor

# or full corpus:
pnpm evaluate -- --live

# open the results viewer:
pnpm view:results
# → http://127.0.0.1:4173/
```

**What you will see in the viewer**

- Status banner: `LIVE` (or `SKIPPED-NO-KEY` / `MOCK-SMOKE` if keys missing)
- Resource parity (same tools; documented budgets)
- Aggregate mean recall/precision **only labeled live when metricsAreLive**
- Per-case baseline vs Checkmate table; click a row for score / match detail
- Paths to sample trajectories; mental-model path when present
- Reports also written to `artifacts/results/comparison.md` + `comparison.json`

Until keys are present, live CDR stays **pending** — we will not invent numbers.
