import { buildRoadmap, shipStatus, proofResult } from "./derive.js";
import { renderMap } from "./map.js";

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function chip(text, cls = "") {
  return `<span class="chip ${cls}">${esc(text)}</span>`;
}

export function renderOverview(root, analysis) {
  const ship = shipStatus(analysis);
  const roadmap = buildRoadmap(analysis);
  const mm = analysis.mentalModel;
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of analysis.findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  const confirmed = analysis.findings.filter(
    (f) => f.verificationStatus === "confirmed",
  ).length;

  root.innerHTML = `
    <div class="view-header">
      <h1>Overview</h1>
      <p>${esc(mm.summary)}</p>
    </div>

    <div class="grid-3" style="margin-bottom:1rem">
      <div class="panel">
        <h2>Ship status</h2>
        <div class="stat">${esc(ship.label)}</div>
        <div class="stat-label">${ship.blockers.length} blocker(s)</div>
      </div>
      <div class="panel">
        <h2>Findings</h2>
        <div class="stat">${analysis.findings.length}</div>
        <div class="stat-label">${confirmed} confirmed · ${analysis.proofs.length} proofs</div>
      </div>
      <div class="panel">
        <h2>Severity mix</h2>
        <div class="chip-row">
          ${Object.entries(counts)
            .filter(([, n]) => n)
            .map(([k, n]) => chip(`${k} ${n}`, k))
            .join("")}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h2>Ship blockers</h2>
        ${
          ship.blockers.length
            ? `<ul class="list-dense">${ship.blockers
                .map(
                  (b, i) =>
                    `<li><span class="idx">${esc(b.id)}</span><div><strong>${esc(b.title)}</strong><div class="chip-row">${chip(b.severity, b.severity)}${chip(b.verificationStatus, b.verificationStatus)}</div></div></li>`,
                )
                .join("")}</ul>`
            : `<p style="margin:0;color:var(--muted);font-size:0.92rem">No confirmed critical/high blockers in this sample.</p>`
        }
        <div class="action-box">
          <strong>Next best action</strong>
          <p>${esc(ship.nextAction)}</p>
        </div>
      </div>
      <div class="panel">
        <h2>Top priorities</h2>
        <ul class="list-dense">
          ${roadmap.now
            .concat(roadmap.next)
            .slice(0, 5)
            .map(
              (item, i) =>
                `<li><span class="idx">${String(i + 1).padStart(2, "0")}</span><div>${esc(item.title)}<div class="chip-row">${chip(item.lane)}${item.proofId ? chip(item.proofId) : ""}</div></div></li>`,
            )
            .join("")}
        </ul>
        <div class="link-row">
          <a href="#map">Open map →</a>
          <a href="#roadmap">Open roadmap →</a>
          <a href="#proofs">Open proofs →</a>
        </div>
      </div>
    </div>

    <div class="guidance">
      <strong>Architecture guidance.</strong>
      Trust boundaries: ${esc((mm.trustBoundaries || []).join(" · ") || "—")}.
      Entry points: ${esc((mm.entryPoints || []).join(", ") || "—")}.
      Open questions: ${esc((mm.openQuestions || []).slice(0, 2).join(" · ") || "none")}.
    </div>
  `;
}

export function renderMapView(root, analysis) {
  root.innerHTML = `
    <div class="view-header">
      <h1>Map</h1>
      <p>Engineering architecture from the mental model. Click a node for evidence, files, risks, and verification status.</p>
    </div>
    <div class="map-layout">
      <div class="map-canvas-wrap" id="map-canvas"></div>
      <div class="panel node-detail" id="node-detail">
        <p class="empty">Select a node.</p>
      </div>
    </div>
  `;

  const detail = root.querySelector("#node-detail");
  renderMap(root.querySelector("#map-canvas"), analysis.map, {
    onSelect(node) {
      if (!node) {
        detail.innerHTML = `<p class="empty">Select a node.</p>`;
        return;
      }
      detail.innerHTML = `
        <h3>${esc(node.label)}</h3>
        <div class="chip-row">${chip(node.type)}${chip(node.verificationStatus || "known", node.verificationStatus || "")}</div>
        <dl>
          <dt>Evidence</dt>
          <dd>${(node.evidence || []).length ? esc(node.evidence.join(" · ")) : "—"}</dd>
          <dt>Files</dt>
          <dd>${(node.files || []).length ? (node.files || []).map((f) => `<code>${esc(f)}</code>`).join(" ") : "—"}</dd>
          <dt>Risks</dt>
          <dd>${(node.risks || []).length ? esc(node.risks.join(" · ")) : "None recorded"}</dd>
          <dt>Related edges</dt>
          <dd>${esc(
            (analysis.map.edges || [])
              .filter((e) => e.from === node.id || e.to === node.id)
              .map((e) => e.label || e.type)
              .join(" · ") || "—",
          )}</dd>
        </dl>
      `;
    },
  });
}

export function renderRoadmap(root, analysis) {
  const roadmap = buildRoadmap(analysis);
  const lane = (name, items, hint) => `
    <section class="lane">
      <div class="lane-head"><h2>${name}</h2><span>${hint}</span></div>
      ${
        items.length
          ? items
              .map(
                (item) => `
          <article class="road-item ${item.lane}">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.rationale)}</p>
            <div class="road-meta">
              ${item.findingId ? chip(item.findingId) : ""}
              ${item.proofId ? chip(item.proofId) : ""}
              ${chip(item.severity, item.severity)}
              ${chip(item.verificationStatus, item.verificationStatus)}
            </div>
          </article>`,
              )
              .join("")
          : `<p style="color:var(--muted);font-size:0.9rem;margin:0">Nothing in this lane.</p>`
      }
    </section>`;

  root.innerHTML = `
    <div class="view-header">
      <h1>Roadmap</h1>
      <p>Derived deterministically from severity and verification status (no LLM roadmap required).</p>
    </div>
    ${lane("NOW", roadmap.now, "Confirmed critical/high — ship blockers")}
    ${lane("NEXT", roadmap.next, "Verified medium or elevated unverified")}
    ${lane("LATER", roadmap.later, "Lower severity, notes, open questions")}
  `;
}

export function renderProofs(root, analysis) {
  const hypById = new Map(analysis.hypotheses.map((h) => [h.id, h]));
  root.innerHTML = `
    <div class="view-header">
      <h1>Proofs</h1>
      <p>Claims with expected vs observed evidence. PROVEN / DISPROVEN / INSUFFICIENT — never invent sandbox output.</p>
    </div>
    <div class="proof-list">
      ${analysis.proofs
        .map((p) => {
          const result = proofResult(p);
          const hyp = p.hypothesisId ? hypById.get(p.hypothesisId) : null;
          return `
          <article class="proof-card">
            <div class="proof-head">
              <h3>${esc(p.id)} — ${esc(p.summary)}</h3>
              ${chip(result, result)}
            </div>
            <p style="margin:0;font-size:0.92rem;color:var(--muted)">${esc(p.claim || hyp?.claim || p.details || "")}</p>
            <div class="chip-row" style="margin-top:0.45rem">
              ${chip(p.findingId || "—")}
              ${p.hypothesisId ? chip(p.hypothesisId) : ""}
              ${chip(p.kind)}
              ${(p.locators || [])
                .map((l) => chip(l.path + (l.symbol ? `#${l.symbol}` : "")))
                .join("")}
            </div>
            <div class="eo-grid">
              <div class="eo"><div class="k">Expected</div><div class="v">${esc(p.expected || "—")}</div></div>
              <div class="eo"><div class="k">Observed</div><div class="v">${esc(p.observed || p.stdoutExcerpt || "—")}</div></div>
            </div>
            <div class="refs">
              Artifact: <code>${esc(p.artifactPath || "—")}</code>
              · toolResultRefs: ${(p.toolResultRefs || []).length
                ? (p.toolResultRefs || [])
                    .map(
                      (r) =>
                        `<code>#${r.stepIndex}${r.toolName ? ":" + r.toolName : ""}</code>`,
                    )
                    .join(" ")
                : "<em>none</em>"}
            </div>
          </article>`;
        })
        .join("")}
    </div>
  `;
}

export function renderChanges(root, analysis) {
  const cc = analysis.changeContract;
  root.innerHTML = `
    <div class="view-header">
      <h1>Changes</h1>
      <p>Change Contract — structured before/after for a proposed fix. Full workflow comes in a later phase.</p>
    </div>
    <div class="stub-banner">
      ${esc(cc?.note || "Change Contract stub — coming in a later phase.")}
      ${cc?.comingIn ? ` <code>${esc(cc.comingIn)}</code>` : ""}
    </div>
    ${
      cc?.before && cc?.after
        ? `<div class="ba-grid">
            <div class="panel">
              <h3>Before</h3>
              <p style="margin:0 0 0.5rem;font-size:0.95rem">${esc(cc.before.summary)}</p>
              <div class="chip-row">${(cc.before.files || []).map((f) => chip(f)).join("")}</div>
              <p style="margin:0.6rem 0 0;font-size:0.88rem;color:var(--danger)">${esc(cc.before.risk || "")}</p>
            </div>
            <div class="panel">
              <h3>After</h3>
              <p style="margin:0 0 0.5rem;font-size:0.95rem">${esc(cc.after.summary)}</p>
              <div class="chip-row">${(cc.after.files || []).map((f) => chip(f)).join("")}</div>
              <p style="margin:0.6rem 0 0;font-size:0.88rem;color:var(--ok)">${esc(cc.after.expectedProof || "")}</p>
            </div>
          </div>`
        : `<div class="panel"><p style="margin:0;color:var(--muted)">No change-contract fixture loaded.</p></div>`
    }
  `;
}

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number" && !Number.isInteger(n)) return n.toFixed(3);
  return String(n);
}

export function renderEval(root, report) {
  if (!report) {
    root.innerHTML = `
      <div class="view-header"><h1>Eval</h1><p>No comparison.json found. Run <code>pnpm evaluate</code> or use the committed example.</p></div>`;
    return;
  }

  const a = report.aggregates || {};
  const delta =
    a.deltaMeanRecall === null || a.deltaMeanRecall === undefined
      ? "—"
      : `${a.deltaMeanRecall >= 0 ? "+" : ""}${Number(a.deltaMeanRecall).toFixed(3)}`;

  root.innerHTML = `
    <div class="view-header">
      <h1>Eval comparison</h1>
      <p>Baseline vs Checkmate on the frozen case corpus. Labels distinguish mock smoke from live CDR.</p>
    </div>
    <div class="status-banner" data-kind="${esc(report.mode)}">
      <div><strong>${esc(report.label)}</strong> · mode=<code>${esc(report.mode)}</code> · liveEval=<code>${esc(report.liveEvalStatus)}</code></div>
      <div style="margin-top:0.35rem">${esc(report.disclaimer)}</div>
      <div style="margin-top:0.35rem">${
        a.metricsAreLive
          ? "Metrics are from a LIVE keyed run."
          : "Metrics are NOT live model CDR (mock or skipped)."
      } · matchPolicy=<code>${esc(report.matchPolicy?.id ?? "?")}</code></div>
    </div>
    <div class="grid-3" style="margin-bottom:1rem">
      <div class="panel"><h2>Baseline mean recall</h2><div class="stat">${fmt(a.baseline?.meanRecall)}</div></div>
      <div class="panel"><h2>Checkmate mean recall</h2><div class="stat">${fmt(a.checkmate?.meanRecall)}</div></div>
      <div class="panel"><h2>Δ mean recall</h2><div class="stat">${delta}</div><div class="stat-label">${a.metricsAreLive ? "live" : "not live CDR"}</div></div>
    </div>
    <div class="panel">
      <h2>Per-case</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>case</th><th>b_rec</th><th>c_rec</th><th>Δ</th><th>label</th></tr></thead>
          <tbody>
            ${(report.rows || [])
              .map((row) => {
                if (!row.baseline || !row.checkmate) {
                  return `<tr><td>${esc(row.caseId)}</td><td colspan="3">${esc(row.error || "—")}</td><td>${chip(row.label)}</td></tr>`;
                }
                const d = row.checkmate.recall - row.baseline.recall;
                return `<tr>
                  <td>${esc(row.caseId)}</td>
                  <td>${row.baseline.recall.toFixed(2)}</td>
                  <td>${row.checkmate.recall.toFixed(2)}</td>
                  <td>${d >= 0 ? "+" : ""}${d.toFixed(2)}</td>
                  <td>${chip(row.label)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
