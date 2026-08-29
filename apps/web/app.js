/**
 * Minimal results viewer — loads data/comparison.json produced by pnpm evaluate.
 */
const statusEl = document.getElementById("status");
const parityEl = document.getElementById("parity");
const aggregatesEl = document.getElementById("aggregates");
const tableEl = document.getElementById("table");
const detailEl = document.getElementById("detail");
const trajectoriesEl = document.getElementById("trajectories");

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number" && Math.abs(n) < 1 && n !== 0) return n.toFixed(3);
  if (typeof n === "number" && !Number.isInteger(n)) return n.toFixed(3);
  return String(n);
}

function badge(label) {
  return `<span class="badge ${label}">${label}</span>`;
}

async function loadReport() {
  const res = await fetch("./data/comparison.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Could not load data/comparison.json (${res.status}). Run pnpm evaluate then pnpm view:results.`,
    );
  }
  return res.json();
}

function renderStatus(report) {
  statusEl.dataset.kind = report.mode;
  const liveNote = report.aggregates?.metricsAreLive
    ? "Metrics are from a LIVE keyed run."
    : "Metrics are NOT live model CDR (mock or skipped).";
  statusEl.innerHTML = `
    <div><strong>${report.label}</strong> · mode=<code>${report.mode}</code> · liveEval=<code>${report.liveEvalStatus}</code></div>
    <div style="margin-top:0.35rem">${report.disclaimer}</div>
    <div style="margin-top:0.35rem">${liveNote} · matchPolicy=<code>${report.matchPolicy?.id ?? "?"}</code> · generated ${report.generatedAt}</div>
  `;
}

function renderParity(report) {
  const p = report.resourceParity;
  if (!p) return;
  parityEl.hidden = false;
  parityEl.innerHTML = `
    <h2>Resource parity</h2>
    <div class="meta-grid">
      <div class="meta"><div class="k">Baseline budget</div><div class="v">${p.baselineBudget.maxToolCalls} tools / ${p.baselineBudget.maxWallTimeMs / 1000}s</div></div>
      <div class="meta"><div class="k">Checkmate budget</div><div class="v">${p.checkmateBudget.maxToolCalls} tools / ${p.checkmateBudget.maxWallTimeMs / 1000}s</div></div>
      <div class="meta"><div class="k">Model (requested)</div><div class="v">${report.model?.requested ?? p.defaultModel}</div></div>
      <div class="meta"><div class="k">OPENAI key</div><div class="v">${report.model?.openaiKeyPresent ? "present" : "absent"}</div></div>
    </div>
    <ul style="margin:0.85rem 0 0;padding-left:1.1rem">
      ${(p.differencesExplained || []).map((d) => `<li>${d}</li>`).join("")}
    </ul>
  `;
}

function renderAggregates(report) {
  const a = report.aggregates;
  aggregatesEl.hidden = false;
  const delta =
    a.deltaMeanRecall === null
      ? "—"
      : `${a.deltaMeanRecall >= 0 ? "+" : ""}${a.deltaMeanRecall.toFixed(3)}`;
  aggregatesEl.innerHTML = `
    <h2>Aggregates ${a.metricsAreLive ? "(live)" : "(not live CDR)"}</h2>
    <div class="meta-grid">
      <div class="meta"><div class="k">Baseline mean recall</div><div class="v">${fmt(a.baseline.meanRecall)}</div></div>
      <div class="meta"><div class="k">Checkmate mean recall</div><div class="v">${fmt(a.checkmate.meanRecall)}</div></div>
      <div class="meta"><div class="k">Δ mean recall</div><div class="v">${delta}</div></div>
      <div class="meta"><div class="k">Cases scored</div><div class="v">${a.casesScored}/${a.casesAttempted}</div></div>
    </div>
  `;
}

function renderTable(report) {
  tableEl.hidden = false;
  const rows = report.rows || [];
  tableEl.innerHTML = `
    <h2>Per-case comparison</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>case</th><th>b_TP</th><th>b_FN</th><th>b_rec</th>
            <th>c_TP</th><th>c_FN</th><th>c_rec</th><th>Δrec</th><th>label</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row, i) => {
              if (!row.baseline || !row.checkmate) {
                return `<tr class="selectable" data-idx="${i}"><td>${row.caseId}</td><td colspan="7">${row.error || "—"}</td><td>${badge(row.label)}</td></tr>`;
              }
              const d = row.checkmate.recall - row.baseline.recall;
              return `<tr class="selectable" data-idx="${i}">
                <td>${row.caseId}</td>
                <td>${row.baseline.truePositives}</td>
                <td>${row.baseline.falseNegatives}</td>
                <td>${row.baseline.recall.toFixed(2)}</td>
                <td>${row.checkmate.truePositives}</td>
                <td>${row.checkmate.falseNegatives}</td>
                <td>${row.checkmate.recall.toFixed(2)}</td>
                <td>${d >= 0 ? "+" : ""}${d.toFixed(2)}</td>
                <td>${badge(row.label)}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  tableEl.querySelectorAll("tr.selectable").forEach((tr) => {
    tr.addEventListener("click", () => {
      tableEl
        .querySelectorAll("tr.selected")
        .forEach((x) => x.classList.remove("selected"));
      tr.classList.add("selected");
      const idx = Number(tr.dataset.idx);
      showDetail(rows[idx]);
    });
  });
}

function showDetail(row) {
  if (!row) return;
  detailEl.hidden = false;
  const findings = {
    caseId: row.caseId,
    label: row.label,
    mentalModelPath: row.mentalModelPath ?? null,
    baseline: row.baseline,
    checkmate: row.checkmate,
    error: row.error ?? null,
  };
  detailEl.innerHTML = `
    <h2>Case detail — ${row.caseId}</h2>
    <p>Click a row to inspect scores / match breakdown. Mental model path (if present): <code>${row.mentalModelPath || "—"}</code></p>
    <div class="detail-panel">
      <pre>${escapeHtml(JSON.stringify(findings, null, 2))}</pre>
    </div>
  `;
}

function renderTrajectories(report) {
  trajectoriesEl.hidden = false;
  const list = report.sampleTrajectories || [];
  trajectoriesEl.innerHTML = `
    <h2>Sample trajectories</h2>
    <ul>
      ${list.map((t) => `<li><code>${t}</code></li>`).join("")}
    </ul>
  `;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

try {
  const report = await loadReport();
  renderStatus(report);
  renderParity(report);
  renderAggregates(report);
  renderTable(report);
  renderTrajectories(report);
} catch (err) {
  statusEl.dataset.kind = "skipped-no-key";
  statusEl.textContent = err instanceof Error ? err.message : String(err);
}
