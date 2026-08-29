# Checkmate — First-Task Plan

**Tagline:** Your AI built it. Checkmate proves it.
**Document role:** Source of truth for architecture, eval, and scope through submission.
**Date:** 2026-08-29. **Deadline:** 2026-08-31 18:00 UTC.
**Hypothesis:** An independent engineering agent can identify critical engineering problems in AI-built applications more reliably than a general-purpose one-shot repository review.

Guiding question for every decision in this document:

> Does this make Checkmate better at independently determining whether AI-built software actually works?

---

## Sources and official constraints (read before the 12 sections)

Read in full before implementation:

- Official brief: micro1 *Agentic Workflows Hackathon* PDF (10 pages), uploaded as `micro1_-_First_Hackathon97ce7c5_7f4a.pdf`.
- Host listing: HackerEarth *Frontier Engineering Challenge 2026*, 2026-08-28 15:00 UTC – 2026-08-31 18:00 UTC, **team size 1**. Instruction / Rule Book / Submission Package tabs are login-gated; they were not readable from this environment. Treat the PDF as the complete scored brief. Before upload, a human must confirm HackerEarth has no extra required fields (video URL, zip, checklist).
- Workspace at plan time: `github.com/aymanissa-dev/Checkmate` on `main`, one file (`README.md` containing `# Checkmate`). No starter repo, no INSTRUCTIONS.md, no prescribed tree.

**Official PDF constraints that bind this plan** (these override informal language in the product spec where they conflict):

| Constraint | Implication for Checkmate |
|---|---|
| Score /100: Problem & User Value 15, **Agent Solution & Engineering 30**, End to End Quality 20, Measured Improvement 15, Reproducibility 15, Hot Take / Insights 5 | Optimize for purposeful agent design and a reproducible eval, not feature count. The product spec’s “qualification gate” and unpublished tie-break are **not** in the PDF. Completeness (changelog, traces, reproduction, video) is treated as eligibility via Ground Rules + the four deliverables, not as a scored row. |
| Fair baseline, **same task and same cases**; explain resource differences | Baseline is an honest one-shot review, not a sabotaged agent. The independent variable is investigation procedure, not file access or model family. |
| Changelog: STAGE / WHAT YOU TRIED AND WHY / EVIDENCE / DECISION; include **removed** experiments | `IMPROVEMENT_CHANGELOG.md` uses that table. No claimed improvement without a measured eval row. |
| ≥10 eval cases; **include one challenging case**; report complete results including failures | 10 synthetic apps. Case 07 (Change Contract) is the challenging case. No cherry-picking. |
| Video ≤5 min: problem → baseline → one realistic execution → comparison → changelog; highlight the **largest contributing change** and **one removed experiment** | Video is a scored narrative, not a product trailer. |
| Trajectories for **every agent**, instructions → tools → feedback → retries → human checkpoints | Logical roles are phases of one agent with one trajectory per run, plus a separate baseline trajectory. Do not spawn decorative multi-agent swarms. |
| Sandbox consequential actions; human approval before they happen; qualified human remains in control | Checkmate investigates and reports. It does not auto-fix, push, or comment on PRs in MVP. Target-app execution is sandboxed and allowlisted. |
| Connect every claim to submitted evidence; never fabricate | This plan contains **no eval numbers**. Metrics appear only after `evaluate:*` runs. |
| Judges must run from a clean environment | Pin Node, lockfile, exact commands, expected artifacts, approximate runtime and cost. |
| PDF Appendix example 1 is “Code analysis: is this repository actually good?” | Same user and bottleneck. Official example suggests ranking 10 approved codebases against human reviewers. We **adapt** that to planted-defect synthetic apps so ground truth is deterministic, hidden from the agent, and scorable in a weekend. Spirit preserved: 10 cases, evidence tied to files/tests/HTTP, same cases for baseline and agent. |
| Individual; disclose tools; licenses; no secrets in the repo | Coding-agent use (Cursor) is required and will be disclosed in README. API keys via env only. |

**Language choice (locked):** TypeScript / Node.js 20+. The UI is required, schemas must be shared with the harness, and the 10 target apps will be tiny Node/Express or Next.js fixtures so one runtime covers agent, eval, and UI. Python is not used unless a later blocked eval need appears; none is expected.

---

## 1. Core problem

Checkmate is an **independent engineering-assurance** problem, not a code-generation problem and not a dashboard problem.

AI coding tools made it cheap to produce a repository that *looks* finished: routes exist, tests are green, the README claims auth, the demo clicks through. The remaining bottleneck is determining whether the generated system actually satisfies engineering properties that **cannot be inspected visually** and **cannot be trusted from the generating agent’s self-report**:

| Property class | Why visual / one-shot review fails |
|---|---|
| **Object-level authorization (IDOR)** | Handler is behind `requireAuth()`. Reviewers see “auth exists” and stop. Ownership is a different property. |
| **Authentication / session integrity** | `jwt.decode` vs `jwt.verify`; cookie flags; session IDs reflected to the client. The names look correct. |
| **Secret confinement** | A key not in `.env` still ships if a server module is imported into a client bundle. Filename heuristics miss it. |
| **Data integrity / isolation** | Decrement-then-save looks correct in a single-threaded reading. Concurrent requests or missing UNIQUE constraints are the defect. |
| **Test/property alignment** | A green suite that never asserts a forbidden access proves almost nothing about the claimed security property. |
| **Unintended agent diffs (change contract)** | The current tree can be locally consistent while a “refactor logging” change also disabled an admin check. |
| **Fail-open error handling** | `catch { return ok: true }` is a few tokens in a payment path. The demo still “works.” |
| **Trust-boundary placement** | Admin UI hidden in React while API routes are open. Architecture, not a missing `if`. |
| **Interaction surface (a11y / SEO as properties)** | A `div` with `onClick` is not a submit control. A `robots.txt` that exists can still `Disallow: /` a marketing site. |

**Generation vs verification.** A coding agent’s objective is to produce code. Its traces are not independent evidence. Checkmate’s objective is to **form intended properties, attempt to falsify them, and refuse to invent evidence**. That is a different loop: model the system, select risk, run experiments, attach proof, and leave the human in control of any consequential action.

**Who has the problem (PDF Q1).** Founders, staff engineers, and reviewers who received an AI-built application (or an AI-authored PR) and must decide whether it is safe to run, merge, or pay for — without trusting the agent that wrote it.

**Bottleneck (PDF Q2).** Independent determination of whether the system is engineered correctly, under time pressure, across properties that require a mental model plus counterexamples rather than keyword search.

Checkmate is **not** a coding agent. It does not repair the target. It investigates it.

---

## 2. Exact hackathon MVP boundary

**Hypothesis-test “done” (this is the real MVP).** By deadline we can hand a stranger the repo and they can:

1. Run baseline and Checkmate on the **same 10 frozen cases**.
2. See a **deterministic** score table whose primary metric is critical-defect detection rate.
3. Inspect **trajectories** and **proofs** that tie findings to files, commands, or HTTP.
4. Read a changelog that attributes any delta to a named experiment, including failures.
5. Open a UI that renders one real run: Overview, Map, Roadmap, Proofs.

If that is true, the thesis is testable. If the UI is pretty and the eval is hand-wavy, the thesis is not tested.

### MUST (ship)

| # | Capability | Minimum “done” |
|---|---|---|
| 1 | Repository ingestion | Copy/clone a local tree into a snapshot. GitHub **URL clone** is enough; no GitHub App. |
| 2 | Mental model | Structured actors, assets, trust boundaries, intended properties; each node tagged FACT or ASSUMPTION. |
| 3 | Engineering map | Typed nodes/edges persisted as JSON; UI may be a list + simple graph. |
| 4 | Investigation planner | Ordered properties to test with stop conditions; stored in agent state, not only in chat. |
| 5 | Checks covering the 10 cases | Authz, authn, secrets, integrity, QA/tests, SEO, change contract, error handling, architecture/trust, a11y. Depth only as needed to detect the planted defects. |
| 6 | Prove engine | Claim → property → experiment → expected → observed → `PROVEN` / `DISPROVEN` / `INSUFFICIENT_EVIDENCE`. |
| 7 | Evidence-backed findings | Same `Finding` schema as baseline. Confidence is `VERIFIED` / `LIKELY` / `UNVERIFIED` / `INFORMATIONAL`. No evidence → cannot be `VERIFIED`. |
| 8 | Engineering roadmap | Prioritized actions from findings (severity × exploitability × blast radius), not a generic checklist. |
| 9 | Baseline | Honest one-shot review. Same cases. Same finding schema. |
| 10 | Evaluation harness | Hidden ground truth, jail, matcher, metrics, JSON+Markdown report. |
| 11 | 10 controlled cases | Tiny synthetic apps. Not keyword-shaped. Case 07 is challenging. |
| 12 | Trajectory logging | One JSONL/JSON trace per run: instructions, model, tools, results, retries, checkpoints. |
| 13 | Improvement changelog | Official 4-column table. Baseline row first. |
| 14 | Reproduction docs | Clean-machine commands, versions, runtime, cost, expected files. |
| 15 | UI | **Overview, Map, Roadmap, Proofs** over saved run artifacts. Single-user, no auth, no billing. |

### SHOULD (only after first Checkmate vs baseline eval)

- GitHub clone-by-URL polish (auth token via env for private repos, still no App).
- Change Contract as a first-class input file (`CHANGE_CONTRACT.md`) — already required by case 07.
- SEO and architecture **as finding categories**, not as content generators.
- `TOOLS.md` / README disclosure of Cursor and model provider.

### COULD (explicitly after eval freeze + UI)

- Human-approved PR comments, webhooks, richer graph layout, production deploy, extra a11y rules beyond case 10.

### NOT NOW

See §12. Auto-fix, swarms, enterprise, billing, orgs, GitHub App, Kafka/Redis/K8s/microservices.

### What “polished UI” means — and what it must not do

Minimum four surfaces, all reading `data/runs/<runId>/` (no second source of truth):

- **Overview** — app identity, stack, finding counts by severity and confidence, readiness summary (investigated properties vs open assumptions).
- **Map** — nodes (service, route, store, secret, test, client, actor) and edges (authn, authz, data flow, trust). A readable list is acceptable; a force graph is optional.
- **Roadmap** — ordered work the human should do, each item pointing at a finding id and proof id.
- **Proofs** — full claim/experiment/evidence chain. Unverified claims are visually distinct. Invented evidence is a product bug.

UI must not precede the harness. If behind on Monday, ship a thin Next.js reader over JSON rather than custom visualization. Static HTML export of the same four views is an acceptable fallback.

---

## 3. Simplest architecture capable of testing the hypothesis

**Hypothesis-shaped split:** baseline and Checkmate share **ingestion + finding schema + eval**. They do **not** share investigation procedure (mental model, plan, prove loop, counterexamples, evidence normalization).

```
                    ┌─────────────┐
   target tree ───► │   ingest    │── snapshot (file index + bytes)
                    └──────┬──────┘
            ┌──────────────┼──────────────┐
            ▼                             ▼
     packages/baseline            packages/checkmate
     1 LLM completion             state machine + tools
     Finding[] + Trajectory       MentalModel + Map + Plan
                                  Proof[] + Finding[] + Roadmap
                                  + Trajectory
            └──────────────┬──────────────┘
                           ▼
                    packages/eval
                    (hidden GT, matcher, metrics)
                           ▼
                      apps/web (read artifacts)
```

### Packages (npm workspaces)

| Package | Responsibility | LLM? |
|---|---|---|
| `packages/shared` | Schemas, enums, JSON parse/validate | No |
| `packages/ingest` | Copy tree, ignore globs, language/manifest detect | No |
| `packages/agent-core` | Model adapter, tool runner, state I/O, trajectory append | Transport only |
| `packages/baseline` | Prompt + one completion + parse `Finding[]` | One call |
| `packages/checkmate` | Stage machine: discover → model → map → plan → investigate → prove → report | Multiple calls, state outside chat |
| `packages/prove` | Experiment runner, sandbox spawn, HTTP localhost, result enum | No (exec) |
| `packages/eval-harness` | Case jail, invoke CLIs, matcher, report | No |
| `apps/cli` | `checkmate investigate`, `checkmate evaluate` | — |
| `apps/web` | Four views | No |

No extra services. Persistence is the filesystem: `data/runs/<runId>/*.json`. No Kafka, Redis, Kubernetes, queue, or microservice mesh.

### Where the LLM is used vs deterministic code

**Deterministic (default, tests without a model):** ingest, jail, schema validation, path search, spawn with timeout, HTTP client, scoring, trajectory file append, UI render.

**LLM:** (1) synthesize mental model from snapshot, (2) propose investigation plan, (3) choose next tool/experiment given state, (4) interpret tool output into facts/assumptions/claims, (5) write finding narrative and roadmap rationale. The model never writes the eval score and never marks `VERIFIED` without a prove-engine result of `DISPROVEN` (for a safety property) or equivalent attached evidence.

### Tool interface (allowlist)

Tools are explicit functions with JSON schemas. The model cannot shell out freely.

| Tool | Baseline | Checkmate | Notes |
|---|---|---|---|
| `list_files` / `read_file` / `search_code` | No (files pre-packed) | Yes | Root-jailed to snapshot |
| `read_manifest` | No | Yes | package.json, lockfile, next.config |
| `record_fact` / `record_assumption` / `upsert_map_node` | No | Yes | Mutates `AgentState` |
| `record_claim` / `record_experiment` | No | Yes | Prove engine inputs |
| `run_command` | No | Yes | Allowlist: `npm test`, `npm install`, `node …`; timeout; no network except spawned app |
| `http_request` | No | Yes | `127.0.0.1` / `localhost` only |
| `emit_finding` | via final JSON | Yes | Validated against schema |

Scratch dir for logs is outside the target tree. **No write-back** to the target app. **No git push.** **No GitHub write.**

### Agent state (outside the conversation)

`AgentState` is a versioned JSON document: stage, mental model, map, plan, claims, experiments, findings, roadmap, budgets (max steps, max spawn seconds). Each LLM call receives a **compiled view** of that state plus the last tool results — not an unbounded chat log as the source of truth. This is required for trajectories and for reproducibility of “what the agent believed.”

**Logical roles, one process:** Orchestrator (stage + budget), Analyzer (model + map), Verifier (prove), Reporter (findings + roadmap). These are functions/stages, not four billed agents. One trajectory per Checkmate run.

### Model abstraction

```ts
interface ModelAdapter {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
```

Env: `CHECKMATE_MODEL_PROVIDER`, `CHECKMATE_MODEL`, `CHECKMATE_API_KEY`. Temperature **0** for official eval. One provider for baseline and Checkmate.

**Recommended default:** OpenAI-compatible HTTP (`baseURL` + key). If the key present at runtime is Anthropic or another vendor, swap the adapter; do not fork the workflow.

### Why this is simple enough to finish

Ten fixtures are <20 files each. The agent is a state machine with ~8 tools. The UI reads JSON. The only research question is whether the extra loop beats one-shot review on planted critical defects.

---

## 4. Baseline design

The baseline is **the reasonable basic way people handle this task today**: paste the repo into a general-purpose model and ask for engineering issues. It is not a weak Checkmate.

### Inputs (identical snapshot to Checkmate)

- The case **app/** tree and **public/** docs only.
- A generic instruction: review this application for engineering defects (security, correctness, tests, architecture, reliability). Emit JSON `Finding[]`.
- **No** case category name, **no** planted-defect description, **no** ground truth, **no** `eval/hidden`, **no** `CHANGE_CONTRACT` special casing beyond whatever files exist in the app (case 07’s contract file is in `app/` because it is part of the application corpus — both agents see it).

### Prompt shape

1. System: senior engineer; output **only** JSON matching the Finding schema; do not invent paths; if uncertain, use `UNVERIFIED` or omit; do not claim execution you did not perform.
2. User: deterministic packing of the tree — relative path + contents, files over a size cap truncated with a notice, binary skipped. These apps are small enough that **the whole tree fits in one prompt**.
3. Single `complete()` call. **Zero tools. Zero second pass. Zero test execution. Zero HTTP.**

### Behavior

- One-shot. Parser extracts `Finding[]`. Invalid JSON → one repair completion **only if** the first parse fails; that repair is logged as a baseline retry. No investigation content in the repair prompt.
- Proof objects may be absent. Confidence should be `UNVERIFIED` or `LIKELY` based on static reading; `VERIFIED` is allowed only if the baseline (incorrectly) claims it — the harness will still count detection, and the **verified finding rate** will expose the lie if evidence is missing (baseline evidence is at most `FILE_RANGE` citations from the prompt).

### Output

Same `Finding` schema as Checkmate so the matcher is fair. Extra Checkmate-only artifacts (mental model, proofs) are simply not produced.

### What the baseline must not receive

- Checkmate tools (`run_command`, `http_request`, `record_experiment`, map/plan schemas).
- Investigation-plan templates, counterexample instructions, evidence-normalization rubrics.
- Ground truth, expected terms, severity keys, category labels (`AUTHORIZATION`, …).
- A crippled context window relative to Checkmate’s file access.
- Distractor files that Checkmate does not also see.

### Honesty protocol

- Same model id, temperature, and file bytes.
- Independent variable: **procedure** (one-shot static vs staged investigate-and-prove).
- Resource difference **must** be stated in the changelog and reproduction guide: Checkmate may use N tool steps and spawn the app; baseline uses 1 completion and packed sources.
- Do not tune the baseline prompt against the 10 cases after seeing scores. Freeze the baseline prompt when the first official `evaluate:baseline` is recorded. Later baseline prompt edits are changelog experiments, not silent fixes.

---

## 5. Advanced Checkmate agent workflow

Checkmate runs a **budgeted state machine**. The model proposes actions; tools and the prove engine produce evidence; the reporter may only emit findings the state can support.

```
discovery → mental model → risk surface (map)
        → investigation plan → static evidence
        → executable verification → counterexample attempts
        → validation (drop inventable claims) → prioritization → report
```

### Stages

1. **Discovery.** Manifest, scripts, entrypoints, env samples, test runner, whether a `CHANGE_CONTRACT.md` / `PR_INTENT.md` exists. Facts only.
2. **Mental model.** Actors, assets, authn mechanism, authz rule (stated vs observed), data stores, trust boundaries, intended user-visible properties. Every statement is `FACT` (cited path) or `ASSUMPTION` (explicit).
3. **Risk surface.** Map nodes/edges. Missing authz edge on a sensitive route is a first-class object, not a vibe.
4. **Investigation plan.** Rank properties to test. Each item: property id, why it matters, experiment sketch, stop condition. Budget: default **max 24 tool calls** and **120s** spawn per case (tunable; freeze before official eval).
5. **Static evidence.** Search/read along the plan. Secret-in-client is a module-graph question, not a `.env` grep-only question.
6. **Executable verification.** If `allowExecute` is true: install in the jail, run tests, spawn server, HTTP probes. Record full command + output hashes/snippets.
7. **Counterexample.** For each safety **assumption** or README claim (“only the owner can read an order”), attempt falsification. Success (`DISPROVEN` safety) becomes a `VERIFIED` finding.
8. **Validation.** A finding without `Evidence[]` cannot be `VERIFIED`. Narratives that cite paths not in the snapshot are stripped. The agent is instructed that fabricating output is a hard failure.
9. **Prioritization.** Roadmap order: critical verified counterexamples first, then likely static, then informational architecture notes. Not OWASP list order.
10. **Report.** `Finding[]`, `Proof[]`, `Roadmap`, `MentalModel`, `EngineeringMap`, trajectory flush.

### Claim / property / experiment / result

- **Claim** — a testable sentence, usually a safety or correctness property believed to hold (“User A cannot read user B’s order”).
- **Property** — the engineering rule (object-level authz on `GET /orders/:id`).
- **Experiment** — concrete procedure (seed users A/B, spawn, `Authorization: A`, `GET /orders/<B>`).
- **Expected / observed** — status code and whether foreign fields appear.
- **Result:**
  - `PROVEN` — experiment ran; safety/correctness property **held**.
  - `DISPROVEN` — counterexample observed; this is the usual path to a `VERIFIED` defect.
  - `INSUFFICIENT_EVIDENCE` — could not spawn, ambiguous response, missing seed data.

`PROVEN` on a safety property is **not** a finding. `DISPROVEN` is. `INSUFFICIENT_EVIDENCE` may yield `LIKELY`/`UNVERIFIED` if static evidence remains.

### Tools and prove engine

Prove engine is deterministic code: it takes a structured `Experiment`, runs it, and returns `ExperimentResult`. The model fills the structure; it does not get to declare `VERIFIED` in prose without that object.

### Human checkpoints (PDF ground rules 04–05)

| Action | Policy |
|---|---|
| Read local snapshot | Allowed |
| Spawn target app / `npm test` in jail | Allowed in eval when `allowExecute: true`; in UI, a confirmation toggle defaulting to off for unknown repos |
| Outbound network from tools | Denied except localhost to the spawned app |
| Write to target repo, git push, PR comment, webhook | Denied in MVP; would require an explicit human approve step later |
| Mark finding `VERIFIED` | Only via prove-engine + evidence validator (not a human checkbox, not the model’s confidence) |

---

## 6. Evaluation methodology

We evaluate **defect detection**, not prose quality. The official PDF allows a custom rubric if the suggested “primary outcome / human time / cost” table is a poor fit; we still report runtime and approximate cost as secondaries.

### Case format (filesystem)

```
eval/cases/<opaqueId>/
  app/                 # agent-visible application
  public/              # agent-visible README / run hints (no bug names)
eval/hidden/<opaqueId>/
  ground-truth.json    # NEVER copied into the jail
```

Opaque ids: `case-01` … `case-10`, not `idor-shop`. The investigate prompt sees a temp directory that contains **only** `app/` (and `public/` merged or copied beside it). Harness cwd and tool root = that temp dir.

**Ground-truth isolation rules:**

- Tools resolve paths under the jail root; `..` is rejected.
- The Checkmate product repo is **not** mounted into the jail. Running Checkmate on Checkmate is out of scope for scored eval.
- `eval/hidden` stays in git so judges can reproduce scoring, but the agent process never receives those paths.
- Unit tests of the matcher load hidden files **in the harness process only**.
- CI/eval logs must not dump ground-truth term lists into agent traces.

### Ground-truth schema (see also §8)

Each case has one or more `ExpectedDefect` rows. At least one per case is `CRITICAL` except SEO (06) and a11y (10), which are `MEDIUM` and exist so the suite is not “security-only.” Primary metric **ignores** non-critical rows.

### Matching algorithm (deterministic; no LLM-as-judge)

A finding **matches** an unmatched expected defect iff all of the following hold:

1. **Location:** at least one `finding.locations[].path` contains at least one `match.locationHints[]` substring (case-sensitive path as stored, compared case-insensitively), **OR** if `locationHints` is empty, at least one `match.symbolHints[]` appears in finding text.
2. **Terms:** for every group in `match.termGroups` (`string[][]`), at least one term in that group appears in the concatenated, lowercased finding text (`title + description + property + evidence.snippets + proof.claim`).
3. **Eligibility:** `confidence !== "INFORMATIONAL"`. Informational items never match GT and never count as false positives.
4. **Assignment:** greedy 1:1. Sort unmatched GT by severity (`CRITICAL` first) then stable id. Sort candidate findings by the same severity then original index. Assign first legal match. A finding cannot match two defects.

**Detection** for a GT row = that row received an assignment. We do **not** require severity equality (HIGH vs CRITICAL still detects). We do **not** require `VERIFIED` for primary recall.

**False positive:** non-informational finding assigned to no GT row.

**Why not LLM-as-judge.** Unreproducible; fights Reproducibility (15) and invites fabricated-looking gains.

**Matcher tightness.** `termGroups` must encode the *property*, not the stack (`express` is not a term). If a finding only says “add more tests” on the IDOR case, it fails the authz term group. Calibrate matcher unit tests with **hand-written** true/false finding fixtures **before** any model run.

### Metrics

**Primary — Critical Defect Detection Rate**

\[
\text{CDDR} = \frac{\#\text{ matched expected defects with severity CRITICAL}}{\#\text{ expected defects with severity CRITICAL}}
\]

Micro-averaged across the frozen set (not macro-averaged per case). Report per-case binary/partial as a table anyway.

**Secondary**

| Metric | Definition |
|---|---|
| Overall recall | Matched GT / all GT |
| Precision | TP / (TP + FP) on non-informational findings |
| False positive count | FP |
| Verified finding rate | Among matched findings, fraction with `confidence === "VERIFIED"` |
| Reproducible evidence rate | Among matched findings, fraction with ≥1 evidence of type `FILE_RANGE`, `COMMAND_OUTPUT`, or `HTTP_TRACE` |
| Runtime | Wall clock per case and total |
| Approx cost | Tokens in/out × published unit price, or vendor usage API; recorded even if $0.00 locally |

Official comparison table (PDF page 4) plus our CDDR row. Include **human time per task** only if we actually time a human baseline; **do not fabricate**. Default: omit human time rather than invent it. Cost per task: record token estimates.

### Commands

```bash
npm run evaluate:baseline    # writes eval/results/baseline-<iso>.json
npm run evaluate:checkmate   # writes eval/results/checkmate-<iso>.json
npm run evaluate:compare     # joins latest (or --baseline --checkmate paths)
                             # writes eval/results/compare-<iso>.json and .md
```

Each result file includes: git SHA, model id, temperature, case set SHA (`eval/cases` + `eval/hidden`), prompt/workflow versions, per-case findings copy, matcher assignments, metrics.

### Freeze protocol

1. Matcher unit tests green on synthetic findings.
2. Ten cases + hidden GT committed.
3. Record `eval-set-sha`. Changelog: “dataset frozen.”
4. Official baseline run → changelog row (even if CDDR is high — that is an honest result).
5. Official Checkmate run → compare.
6. Method changes after freeze get new changelog rows and **new** result files. Do not overwrite official rows.
7. Adding/removing cases after freeze is a **dataset** experiment, labeled as such, not claimed as agent improvement.
8. **No cherry-picking.** All 10 cases appear in the submitted table, including zeros.
9. Default: **one** official temperature-0 run per system. Optional appendix: two extra seeds for variance — never replace the official row with the best seed.

### Challenging case

PDF requires one. **Case 07 (Change Contract)** is it: the tree is locally plausible; the defect is that a stated “logging-only” change also opened an admin path. Detection requires reading the contract **and** proving the production path ignores admin checks.

---

## 7. First 10 evaluation cases

All fixtures: 1–3 HTTP routes or 1 small UI, ≤20 source files, `npm test` optional, spawnable in <15s. No filenames like `vulnerable.ts`, no `// SECURITY BUG`, no `eval(userInput)` as the planted story.

| ID | Name | Category | App type | Planted defect | Why baseline may miss | How Checkmate can prove | Sev | What “detection” means |
|---|---|---|---|---|---|---|---|---|
| 01 | `shop-idor` | AUTHORIZATION | Express JSON shop | `GET /orders/:id` requires login, **not** ownership. Seed: users A/B with distinct orders. | `requireAuth` is visible; reviewers equate authn with authz. | Mental model: orders are per-user assets. HTTP as A for B’s id → 200 + B’s payload. | CRITICAL | Finding locates the handler; term groups cover order + (idor\|ownership\|authoriz\|object-level). |
| 02 | `jwt-decode-auth` | AUTHENTICATION | Express JWT API | Access control uses `jwt.decode` (no signature verify). Unsigned/forged token accepted. | File mentions JWT and `Authorization`; `decode` vs `verify` is easy to skip in a dump. | Claim “tokens must be verified” → send forged token → 200. | CRITICAL | Location on the decode call site; terms (jwt\|token) + (decode\|unverified\|signature\|forged). |
| 03 | `client-bundle-secret` | SECRETS | Next.js App Router | `STRIPE_SECRET_KEY` (or equivalent) imported into a **client** component via a shared `lib/stripe.ts`. No `.env` in repo; value is a clearly secret-shaped string in a server-looking module. | Baseline greps for `.env` / `process.env` and sees a `lib/` path. | Map client/server boundary; show import chain into `"use client"`. | CRITICAL | Location hits `lib/stripe.ts` or the client importer; terms (secret\|key\|stripe) + (client\|bundle\|browser). |
| 04 | `inventory-race` | DATA INTEGRITY | Express in-memory shop | Quantity check and decrement are not atomic; two concurrent POSTs both 200 and quantity goes negative. | Single-threaded reading looks fine (`if (qty) qty--`). | Two parallel `http_request`s on the same SKU. | CRITICAL | Location on the purchase handler; terms (inventory\|quantity\|stock) + (race\|concurrent\|double\|oversell\|atomic). |
| 05 | `tests-pass-wrong-property` | QA | Express + Jest | README: “admin API fully tested.” Tests `GET /admin/stats` → 200 only. Route has **no** auth. | Green tests + “describe admin” strings look like quality. | Compare claimed property (admin-only) to assertions; HTTP without cookie still 200. | HIGH | Location on test file **or** admin route; terms (test\|assert) + (admin\|unauthor\|missing). Primary metric: not critical. Still scored on overall recall. |
| 06 | `robots-vs-marketing` | SEO | Next.js marketing page | `public/robots.txt` is `Disallow: /`. Index is client-rendered with **no** title/description. `public/README`: “SEO-critical launch landing.” | `robots.txt` *exists*; baseline may praise it or ignore SEO. | Intended public index vs robots + missing metadata. | MEDIUM | Location `robots.txt` or root page; terms (robots\|noindex\|disallow) and (title\|meta\|seo) as groups. |
| 07 | `logging-only-contract` | CHANGE CONTRACT | Express admin API | `CHANGE_CONTRACT.md`: “refactor logging only; do not change authz.” Code: `if (process.env.SKIP_ADMIN_CHECK !== "false")` skip admin check — default skip on the **production** path. Looks like a test flag. | One-shot may flag missing admin check **or** miss it as config. May not treat contract violation as the issue. Challenging: must bind **intent vs behavior**. | Load contract; map flag default; HTTP `/admin` without admin role → 200. | CRITICAL | Location on the skipped check or contract file; term groups: (admin\|authoriz) **and** (contract\|intent\|logging\|skip_admin\|flag). Matcher requires both so “add logging” findings do not count. |
| 08 | `payment-catch-ok` | ERROR HANDLING | Express orders + fake charger | `charge()` throws; `catch { order.status = "paid"; return { ok: true } }`. | Happy-path read never enters catch; demo “pays.” | Force charger failure (env `CHARGE_FAIL=1` documented in public run hints as a test switch, not as the bug) or stub; observe `paid`. | CRITICAL | Location on catch in payment handler; terms (payment\|charge) + (catch\|swallow\|ok.*true\|mark.*paid). |
| 09 | `authz-in-ui-only` | ARCHITECTURE | Next.js | Admin nav hidden when `user.role !== "admin"`. `/api/admin/users` has **no** server check. | May say “add middleware” as a generic LOW without proving the API. Distinct from 01: here **list** endpoint is open, not IDOR on ids. | Trust-boundary map: browser untrusted. HTTP GET API as non-admin → 200 + users. | CRITICAL | Location on the API route; terms (admin\|api) + (client\|ui\|frontend\|trust) **or** (unauthenticated\|no auth). |
| 10 | `div-click-checkout` | ACCESSIBILITY | Next.js checkout | Pay control is `<div onClick={pay}>` with an icon, no `button`, no keyboard handler, no accessible name. | Baseline often skips a11y; if it runs, it looks for missing `alt` on unrelated images. | Intended checkout vs actual interaction surface (not a role). | MEDIUM | Location on the checkout component; terms (div\|click\|keyboard\|button\|accessible\|name). |

**Case 05 note:** HIGH, not CRITICAL, so a tests-only miss does not dominate CDDR. Cases 01–04 and 07–09 carry the primary metric (7 critical defects; case 04 is critical). Count locked when GT files are written; if we add a second critical to a case, CDDR denominator changes and must be changelog’d.

**Non-triviality bar.** If a naive `rg "TODO|PASSWORD|eval("` would catch it, the case is illegal. Defects require a model of intended properties.

---

## 8. Schemas

Canonical types live in `packages/shared`. JSON on disk is the persistence format. Enums are closed for MVP.

```ts
export type Confidence = "VERIFIED" | "LIKELY" | "UNVERIFIED" | "INFORMATIONAL";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type FactKind = "FACT" | "ASSUMPTION";
export type ProofResult = "PROVEN" | "DISPROVEN" | "INSUFFICIENT_EVIDENCE";
export type RunStage =
  | "discovery"
  | "mental_model"
  | "map"
  | "plan"
  | "investigate"
  | "prove"
  | "validate"
  | "report"
  | "done"
  | "failed";

export type MapNodeType =
  | "actor"
  | "client"
  | "service"
  | "route"
  | "store"
  | "secret"
  | "test"
  | "contract"
  | "trust_boundary";

export type MapEdgeType = "authn" | "authz" | "data_flow" | "trust" | "imports" | "invokes";

export type EvidenceType =
  | "FILE_RANGE"
  | "COMMAND_OUTPUT"
  | "HTTP_TRACE"
  | "TEST_RESULT"
  | "MANIFEST";

export interface FileLocation {
  path: string;          // jail-relative
  startLine?: number;
  endLine?: number;
}

export interface Evidence {
  type: EvidenceType;
  locations?: FileLocation[];
  snippet?: string;      // truncated; never invent
  command?: string;
  http?: { method: string; url: string; status: number; bodyExcerpt?: string };
  recordedAt: string;    // ISO-8601
}

export interface Fact {
  id: string;
  kind: FactKind;
  text: string;
  citations: FileLocation[];  // empty only if ASSUMPTION
}

export interface ApplicationMentalModel {
  appName: string;
  summary: string;
  stack: string[];
  actors: Fact[];
  assets: Fact[];
  trustBoundaries: Fact[];
  intendedProperties: Fact[];  // what should be true
  openAssumptions: Fact[];     // kind ASSUMPTION
}

export interface MapNode {
  id: string;
  type: MapNodeType;
  label: string;
  locations?: FileLocation[];
}

export interface MapEdge {
  id: string;
  type: MapEdgeType;
  from: string;
  to: string;
  label?: string;
}

export interface EngineeringMap {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface PlannedCheck {
  id: string;
  property: string;
  rationale: string;
  experimentSketch: string;
  stopWhen: string;
  priority: number;
}

export interface InvestigationPlan {
  checks: PlannedCheck[];
  maxToolCalls: number;
  maxSpawnSeconds: number;
}

export interface Claim {
  id: string;
  text: string;
  property: string;
  relatedPlanIds?: string[];
}

export interface Experiment {
  id: string;
  claimId: string;
  procedure: string;
  expected: string;
  command?: string;
  http?: { method: string; url: string; headers?: Record<string, string> };
}

export interface Proof {
  id: string;
  claim: Claim;
  property: string;
  experiment: Experiment;
  expected: string;
  observed: string;
  result: ProofResult;
  evidence: Evidence[];
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
  category:
    | "AUTHORIZATION"
    | "AUTHENTICATION"
    | "SECRETS"
    | "DATA_INTEGRITY"
    | "QA"
    | "SEO"
    | "CHANGE_CONTRACT"
    | "ERROR_HANDLING"
    | "ARCHITECTURE"
    | "ACCESSIBILITY"
    | "OTHER";
  property?: string;
  locations: FileLocation[];
  evidence: Evidence[];
  proofId?: string;
  roadmapRank?: number;
}

export interface RoadmapItem {
  rank: number;
  title: string;
  findingId: string;
  rationale: string;
}

export interface AgentState {
  schemaVersion: 1;
  runId: string;
  stage: RunStage;
  mentalModel?: ApplicationMentalModel;
  map?: EngineeringMap;
  plan?: InvestigationPlan;
  claims: Claim[];
  experiments: Experiment[];
  proofs: Proof[];
  findings: Finding[];
  roadmap: RoadmapItem[];
  toolCallCount: number;
  allowExecute: boolean;
}

export interface MatchRule {
  locationHints: string[];
  symbolHints?: string[];
  termGroups: string[][];
}

export interface ExpectedDefect {
  id: string;
  severity: Severity;
  category: Finding["category"];
  summary: string;       // harness-only; never sent to agent
  match: MatchRule;
}

export interface GroundTruth {
  caseId: string;
  expectedDefects: ExpectedDefect[];
}

export interface EvaluationCasePublic {
  caseId: string;        // opaque
  displayName: string;   // harness UI only, not in agent prompt
}

export interface TrajectoryEvent {
  ts: string;
  type:
    | "run_start"
    | "instructions"
    | "stage"
    | "model_request"
    | "model_response"
    | "tool_call"
    | "tool_result"
    | "retry"
    | "human_checkpoint"
    | "finding_emitted"
    | "run_end"
    | "error";
  stage?: RunStage;
  summary: string;
  payload?: unknown;     // prompts/tools; redact env secrets
}

export interface Trajectory {
  runId: string;
  agent: "baseline" | "checkmate";
  model: string;
  temperature: number;
  caseId?: string;
  events: TrajectoryEvent[];
}
```

**Confidence rules (product, not matcher):**

- `VERIFIED` — attached proof `DISPROVEN` (unsafe) or equivalent execution evidence; evidence array non-empty.
- `LIKELY` — strong static citations; execution not done or `INSUFFICIENT_EVIDENCE`.
- `UNVERIFIED` — weak or single-location suspicion.
- `INFORMATIONAL` — no defect claimed.

Never invent `Evidence.snippet` that is not a substring of tool output or file bytes.

---

## 9. Repository structure

```
README.md
IMPROVEMENT_CHANGELOG.md
docs/
  HACKATHON_PLAN.md          # this file
  REPRODUCTION.md
  HOT_TAKE.md                # filled after eval, not before
  VIDEO_SCRIPT.md            # Monday
apps/
  cli/                       # investigate + evaluate entrypoints
  web/                       # Overview, Map, Roadmap, Proofs
packages/
  shared/
  ingest/
  agent-core/
  baseline/                  # must not import checkmate or prove
  checkmate/                 # must not be imported by baseline
  prove/
  eval-harness/
eval/
  cases/case-01/…/case-10/
  hidden/case-01/…           # in git; not in jail
  fixtures/matcher/          # hand-written findings for matcher tests
  results/                   # committed official JSON+md (no secrets)
prompts/
  baseline.system.md
  checkmate.system.md
data/runs/                   # gitignored artifacts; sample run committed under traces/
traces/                      # representative trajectories for submission
package.json                 # workspaces
package-lock.json
.env.example                 # CHECKMATE_API_KEY etc.
```

**Deviations from a larger “product” tree:** no `packages/github-app`, no `packages/billing`, no `infra/`, no `deploy/`. Eval is first-class, not `apps/eval`. Baseline is a **separate package** so a careless import is a lint/architecture break.

**Ground-truth isolation in the tree:** hidden JSON is in-repo for judge reproduction; isolation is **runtime jail**, not secrecy-by-omission. Document this in REPRODUCTION.md so judges are not confused.

**README at plan time:** one-line pointer to this document until the product README is written in the docs phase.

---

## 10. Five largest technical / hackathon risks

### 1. Time: UI and ten apps crowding out the hypothesis test

**Why it kills us.** End-to-End Quality is 20, but Measured Improvement (15) and Agent Engineering (30) require a real eval. A polished shell with no CDDR is a losing shape.

**Mitigation.** Eval-first sequence in §11. Cases stay tiny. UI is an artifact reader. Cut graph cosmetics, GitHub App, and extra engines before cutting matcher tests or prove-on-01/07/09.

### 2. LLM nondeterminism making “improvement” unreproducible

**Why.** One lucky baseline miss or Checkmate hit becomes a story we cannot rerun (Reproducibility 15; Ground Rule 09).

**Mitigation.** Temperature 0; pin model id; commit prompts; one official run; matcher is deterministic; log tokens. If a case flips, say so in the changelog — do not seed-hunt.

### 3. Target apps that will not execute in the jail

**Why.** Prove engine is the intended advantage. If spawn fails, Checkmate collapses toward “better prompt + grep,” and CDDR may not beat baseline.

**Mitigation.** Each fixture has a harness smoke: `install → start → health → kill` **without** an LLM, written when the case is created. Prefer Express over full Next.js where Next is not required (cases 03, 06, 09, 10 need Next for client/server or metadata; others stay Express). `INSUFFICIENT_EVIDENCE` is allowed; still require static path+terms for detection.

### 4. Scoring ambiguity (matcher too loose or too tight)

**Why.** Loose: baseline keyword hits inflate both scores and hide the thesis. Tight: Checkmate describes the IDOR in synonyms and scores 0.

**Mitigation.** Hand-written true/false fixtures per case **before** model eval. Term groups use OR-synonyms for the *property*. Location hints point at the real file names we will write. Do not use LLM-as-judge. If we must loosen a group after seeing a *valid* Checkmate miss, that is a changelog “scorer calibration” row, not silent credit.

### 5. Ground-truth leakage and “fabricated-looking” results

**Why.** Agent reads `eval/hidden` or prompts mention “look for IDOR.” Judges discount the 15 improvement points. Cost blow-up from unbounded tools is a related failure mode.

**Mitigation.** Jail + opaque ids + generic prompts. Budget 24 tool calls. Redact API keys in traces. Never hand-edit official result JSON. Disclose Cursor in README (coding-agent use is required, not hidden).

**Explicitly not in the top five, but watched:** GitHub App complexity (excluded); eval token cost (tiny files; cap steps); UI time sink (same as risk 1).

---

## 11. Prioritized implementation plan (remaining period)

**Clock:** ~2026-08-29 11:30 UTC → **2026-08-31 18:00 UTC** (~54 hours). Buffer **4 hours** before deadline for HackerEarth upload, video encode, and a frozen re-run.

Eval-first. Do not start UI before `evaluate:baseline` exists. Do not claim improvement before `evaluate:compare`. Record every meaningful experiment in `IMPROVEMENT_CHANGELOG.md` using the official columns.

### Phase 0 — Plan freeze (this document)

Human review of this file. Implementation treats recommended defaults in the closing section as unblocked.

### Phase 1 — Skeleton, schemas, adapter, trajectories

`packages/shared` + empty CLIs + `agent-core` trajectory JSONL + model adapter with a **fake** adapter for tests. No product features.

### Phase 2 — Ten fixtures + hidden GT + matcher tests (**no LLM**)

Build cases 01–10 as runnable miniapps. Write `ground-truth.json`. Write `eval/fixtures/matcher` true/false findings. Harness smoke: pack jail, deny `../hidden`, spawn health for execute cases.

**Cut if behind:** Next.js cases 06/10 become even smaller (single page). Do not cut case count below 10.

### Phase 3 — Baseline + `evaluate:baseline`

Pack tree, one completion, parse findings, score. Changelog: Baseline row with real CDDR (whatever it is).

### Phase 4 — Ingest + mental model + map + plan (Checkmate static path)

State machine through `plan`. Tools: list/read/search/record_*. No spawn yet. Optional unofficial compare — label **partial**, not official.

### Phase 5 — Prove engine

`run_command` + `http_request` + proof objects + confidence validator. Unit-test prove engine on case 01 without the LLM (scripted experiment).

### Phase 6 — Full Checkmate loop + `evaluate:checkmate` + `compare`

Official Checkmate row. If CDDR ≤ baseline: that is a result; changelog it; iterate Phase 7. **Do not** silently change GT.

### Phase 7 — One measured iteration (the “largest contributing change” for the video)

Inspect baseline misses vs Checkmate misses. Add **one** workflow change (example candidates: force counterexample on every `ASSUMPTION` safety property; add client/server import graph tool; require HTTP on routes tagged sensitive). Re-run compare. Keep or revert with evidence. Intentionally try **one** change we are willing to **remove** (video requirement) — e.g. a generic OWASP checklist stage — if it raises FPs.

### Phase 8 — UI

Overview / Map / Roadmap / Proofs on a committed sample run plus live `data/runs`. No auth.

**Cut if behind Monday noon UTC:** JSON-to-HTML templates, skip graph library.

### Phase 9 — Submission package

README (user, bottleneck, value, tool disclosure). `docs/REPRODUCTION.md` (versions, commands, runtime, cost). Changelog complete including removed experiment. `docs/HOT_TAKE.md` from a real failure mode. `traces/` for baseline + Checkmate on at least case 07 and one success case; keep full `eval/results`. `docs/VIDEO_SCRIPT.md` following PDF order.

### Phase 10 — Freeze and submit

Re-run official compare on frozen SHA. Confirm HackerEarth fields. Upload before 18:00 UTC.

### Sequence if behind (cut order)

1. GitHub clone polish  
2. Graph visualization  
3. Extra changelog iterations beyond one keep + one remove  
4. Variance seeds  
5. UI → static HTML  
6. Never cut: 10 cases, matcher, baseline, trajectories, reproduction, honesty about numbers  

### Day packing (concrete)

| Window | Outcome |
|---|---|
| Sat remaining | Phases 1–3: schemas, 10 apps, matcher tests, baseline scores |
| Sun | Phases 4–7: Checkmate + prove + official compare + one iteration |
| Mon morning | Phase 8 UI |
| Mon afternoon | Phase 9–10 docs, video, freeze rerun, submit; 4h buffer |

Coding agents (Cursor) implement under this plan; humans approve eval freeze and any later GitHub write. Disclose that in README.

---

## 12. Deliberate exclusions

Excluded because they **do not** improve independent determination of whether AI-built software works, or they steal the hours that do.

| Excluded | Why |
|---|---|
| Auto-fix / patch PRs | That is a coding agent. It contaminates independence and is a consequential write. |
| Multi-agent swarm (N concurrent LLMs) | PDF: purposeful design > component count. Four roles as stages already produce traces. Swarms add cost and noise. |
| GitHub App, webhooks, org/SSO, billing | Integration surface, not verification quality. Clone-by-URL is enough. |
| Enterprise dashboards, multi-tenancy | Not the hypothesis. |
| Kafka, Redis, K8s, microservices, vector DB | Operational complexity without eval gain. Filesystem state is sufficient. |
| Fine-tuning / custom models | Unreproducible for judges; no time. |
| LLM-as-judge scoring | Irreproducible primary metric. |
| Live attack of third-party production apps | Ethics/legal (Ground Rules 06–07); use synthetic fixtures. |
| Dozens of check engines (full OWASP, full WCAG, full CWEs) | Checklist theater. Depth on 10 properties that discriminate baseline vs Checkmate. |
| Keyword-only secret scanners as the product | Baseline can do that; it does not test the thesis. |
| Generating architecture docs / SEO copy | Generation, not verification. SEO/a11y are **properties to test**, not content to write. |
| Claiming CDDR, cost, or human-time numbers in README before `evaluate:compare` | Fabrication. Ground Rule 09. |
| Sabotaging the baseline | Invalidates Measured Improvement. |
| Decorative agents without tools or state | Fails Agent Solution & Engineering. |

---

## Recommended defaults (unblocking implementation after review)

Treat these as decided unless a human overrides them. None are blocked on open questions.

1. **Stack:** Node 20 + TypeScript + npm workspaces + Next.js App Router for `apps/web` only.
2. **Model:** one adapter, temperature 0, same model for baseline and Checkmate; provider from env.
3. **Baseline:** full-tree pack, **no tools**, one completion (+ one parse-repair).
4. **Checkmate:** one process, staged `AgentState`, allowlisted tools, max 24 tool calls / 120s spawn per case.
5. **Jail:** tool root = case temp dir; `eval/hidden` in git; never copied in.
6. **Primary metric:** micro-averaged CDDR; matcher = locationHints + termGroups + greedy 1:1; no LLM judge.
7. **GitHub:** local path + optional `git clone` URL; no App.
8. **Cases:** the ten rows in §7; case 07 is the challenging case.
9. **Roles:** logical stages, one Checkmate trajectory per run.
10. **Scoring source of truth:** official PDF 6-row rubric. Completeness of the four deliverables is eligibility.
11. **Changelog / video:** follow PDF structure exactly, including a **removed** experiment.
12. **Execute policy:** `allowExecute: true` for eval; UI default off for unknown repos.
13. **UI:** four views over run JSON; build after first compare.
14. **Human time metric:** omit unless actually measured.
15. **Coding-agent disclosure:** README names Cursor (and any other generators) and what they wrote vs what eval measured.

---

## Open questions (non-blocking)

1. **HackerEarth extra upload fields** (video hosting, zip vs GitHub URL). Default: public GitHub repo + README + traces in-tree; confirm tabs at submit time.
2. **Exact model id available in the runtime env.** Default: whatever `CHECKMATE_MODEL` points at; freeze the id in result JSON.
3. **micro1 ownership of submissions** (product spec, not PDF). Default: assume organizers may use the submission; keep secrets out of the repo.

No question above blocks Phase 1.
