/** Load sample analysis + optional comparison report. */

const SAMPLE_BASE = "./data/sample-analysis";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

/**
 * Derive a lightweight engineering map from ApplicationMentalModel
 * when engineering_map.json is absent.
 */
export function deriveMapFromMentalModel(mm) {
  const nodes = [];
  const edges = [];
  const add = (id, type, label, extra = {}) => {
    nodes.push({
      id,
      type,
      label,
      evidence: extra.evidence || [],
      files: extra.files || [],
      risks: extra.risks || [],
      verificationStatus: extra.verificationStatus || "known",
    });
  };

  add("actor:caller", "actor", "Caller");
  (mm.entryPoints || []).forEach((ep, i) => {
    const id = `route:${i}`;
    add(id, "route", ep, { evidence: [ep] });
    edges.push({
      id: `e-actor-${i}`,
      type: "invokes",
      from: "actor:caller",
      to: id,
      label: "calls",
    });
  });
  (mm.components || []).forEach((c, i) => {
    const id = `service:${i}`;
    add(id, "service", c, { files: guessFiles(c) });
    if (mm.entryPoints?.[0]) {
      edges.push({
        id: `e-svc-${i}`,
        type: "invokes",
        from: "route:0",
        to: id,
        label: "handled by",
      });
    }
  });
  (mm.dataStores || []).forEach((d, i) => {
    const id = `store:${i}`;
    add(id, "store", d);
    const svc = nodes.find((n) => n.type === "service");
    if (svc) {
      edges.push({
        id: `e-store-${i}`,
        type: "data_flow",
        from: svc.id,
        to: id,
        label: "reads/writes",
      });
    }
  });
  (mm.trustBoundaries || []).forEach((t, i) => {
    add(`boundary:${i}`, "trust_boundary", t, { evidence: [t] });
  });

  return {
    schemaVersion: 1,
    caseId: mm.caseId,
    derivedFrom: "mental_model.json",
    nodes,
    edges,
  };
}

function guessFiles(component) {
  const m = String(component).match(/([\w./-]+\.(js|ts|mjs|cjs|py|go))/);
  return m ? [m[1]] : [];
}

export async function loadAnalysis() {
  const manifest = await fetchJson(`${SAMPLE_BASE}/manifest.json`);
  const paths = manifest.artifactPaths || {};

  const [
    mentalModel,
    findingsDoc,
    hypothesesDoc,
    proofs,
    reportMd,
    scopeMd,
    engineeringMap,
    changeContract,
  ] = await Promise.all([
    fetchJson(`${SAMPLE_BASE}/${paths.mentalModel || "mental_model.json"}`),
    fetchJson(`${SAMPLE_BASE}/${paths.findings || "findings.json"}`),
    fetchJson(`${SAMPLE_BASE}/${paths.hypotheses || "hypotheses.json"}`),
    fetchJson(`${SAMPLE_BASE}/${paths.proofs || "proofs.json"}`),
    fetchText(`${SAMPLE_BASE}/${paths.report || "report.md"}`).catch(() => ""),
    fetchText(`${SAMPLE_BASE}/${paths.scope || "scope.md"}`).catch(() => ""),
    fetchJson(
      `${SAMPLE_BASE}/${paths.engineeringMap || "engineering_map.json"}`,
    ).catch(() => null),
    fetchJson(
      `${SAMPLE_BASE}/${paths.changeContract || "change_contract.stub.json"}`,
    ).catch(() => null),
  ]);

  const map = engineeringMap || deriveMapFromMentalModel(mentalModel);

  return {
    manifest,
    mentalModel,
    map,
    findings: findingsDoc.findings || [],
    hypotheses: hypothesesDoc.hypotheses || [],
    proofs: Array.isArray(proofs) ? proofs : proofs.proofs || [],
    reportMd,
    scopeMd,
    changeContract,
  };
}

export async function loadComparison() {
  try {
    return await fetchJson("./data/comparison.json");
  } catch {
    try {
      return await fetchJson("./data/comparison.example.json");
    } catch {
      return null;
    }
  }
}
