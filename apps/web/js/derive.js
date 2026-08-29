/** Deterministic NOW / NEXT / LATER roadmap from findings + mental model. */

const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function sevRank(s) {
  return SEV_RANK[s] ?? 5;
}

/**
 * @param {{ findings: any[], hypotheses: any[], mentalModel: any, proofs: any[] }} analysis
 */
export function buildRoadmap(analysis) {
  const { findings, mentalModel, proofs } = analysis;
  const proofByFinding = new Map(
    (proofs || []).map((p) => [p.findingId, p]),
  );

  const items = (findings || []).map((f) => {
    const proof = proofByFinding.get(f.id);
    const confirmed = f.verificationStatus === "confirmed";
    const criticalish = f.severity === "critical" || f.severity === "high";
    let lane = "later";
    if (confirmed && criticalish) lane = "now";
    else if (confirmed || criticalish) lane = "next";
    else if (f.verificationStatus === "unverified" && f.severity === "medium")
      lane = "next";
    else lane = "later";

    return {
      id: f.id,
      lane,
      title: f.title,
      severity: f.severity,
      verificationStatus: f.verificationStatus || "unverified",
      findingId: f.id,
      proofId: proof?.id || f.proofIds?.[0] || null,
      rationale:
        lane === "now"
          ? "Confirmed high-impact defect with sandbox evidence — blocks ship."
          : lane === "next"
            ? "Verified gap or elevated risk — schedule after blockers."
            : "Lower severity or insufficient evidence — track, do not block.",
    };
  });

  for (const q of mentalModel?.openQuestions || []) {
    items.push({
      id: `Q:${items.length}`,
      lane: "later",
      title: q,
      severity: "info",
      verificationStatus: "open",
      findingId: null,
      proofId: null,
      rationale: "Open question from mental model — resolve when touching the area.",
    });
  }

  const order = { now: 0, next: 1, later: 2 };
  items.sort((a, b) => {
    const lo = order[a.lane] - order[b.lane];
    if (lo !== 0) return lo;
    return sevRank(a.severity) - sevRank(b.severity);
  });

  return {
    now: items.filter((i) => i.lane === "now"),
    next: items.filter((i) => i.lane === "next"),
    later: items.filter((i) => i.lane === "later"),
    all: items,
  };
}

export function shipStatus(analysis) {
  const blockers = (analysis.findings || []).filter(
    (f) =>
      f.verificationStatus === "confirmed" &&
      (f.severity === "critical" || f.severity === "high"),
  );
  if (blockers.length) {
    return {
      status: "blocked",
      label: "Ship blocked",
      blockers,
      nextAction: blockers[0]
        ? `Resolve ${blockers[0].id}: ${blockers[0].title}`
        : "Resolve confirmed critical/high findings",
    };
  }
  const open = (analysis.findings || []).filter(
    (f) => f.verificationStatus === "unverified",
  );
  if (open.length) {
    return {
      status: "caution",
      label: "Ship with caution",
      blockers: open,
      nextAction: `Verify or accept risk on ${open[0].id}`,
    };
  }
  return {
    status: "ready",
    label: "No confirmed blockers",
    blockers: [],
    nextAction: "Re-run Checkmate after the next material change",
  };
}

export function proofResult(proof) {
  if (proof.result) return proof.result;
  if (proof.verified === true) return "PROVEN";
  if (proof.verified === false && proof.kind === "reasoning") return "INSUFFICIENT";
  return "INSUFFICIENT";
}
