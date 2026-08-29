/** Lightweight SVG engineering map (no graph library). */

const TYPE_COL = {
  actor: 0,
  client: 0,
  trust_boundary: 1,
  route: 2,
  service: 3,
  store: 4,
  secret: 4,
  test: 5,
  contract: 5,
};

/**
 * Layout nodes in columns by type; return positions map.
 */
function layout(nodes, width, height) {
  const cols = new Map();
  for (const n of nodes) {
    const c = TYPE_COL[n.type] ?? 3;
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c).push(n);
  }
  const colKeys = [...cols.keys()].sort((a, b) => a - b);
  const pos = new Map();
  const padX = 36;
  const padY = 36;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  colKeys.forEach((ck, ci) => {
    const list = cols.get(ck);
    const x =
      padX +
      (colKeys.length === 1
        ? usableW / 2
        : (usableW * ci) / Math.max(1, colKeys.length - 1));
    list.forEach((n, ri) => {
      const y =
        padY +
        (list.length === 1
          ? usableH / 2
          : (usableH * ri) / Math.max(1, list.length - 1));
      pos.set(n.id, { x, y, node: n });
    });
  });
  return pos;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(s, n) {
  const t = String(s);
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * Render interactive SVG map into container.
 * @returns {{ select: (id: string|null) => void }}
 */
export function renderMap(container, map, { onSelect } = {}) {
  const width = 720;
  const height = 440;
  const nodes = map.nodes || [];
  const edges = map.edges || [];
  const pos = layout(nodes, width, height);

  const edgeEls = edges
    .map((e) => {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) return "";
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 - 8;
      const risk = e.risk || /MISSING|missing/i.test(e.label || "");
      return `
        <path class="edge-line ${risk ? "risk" : ""}" d="M${a.x},${a.y} L${b.x},${b.y}" />
        ${
          e.label
            ? `<text class="edge-label" x="${midX}" y="${midY}" text-anchor="middle">${escapeXml(truncate(e.label, 22))}</text>`
            : ""
        }
      `;
    })
    .join("");

  const nodeW = 118;
  const nodeH = 40;

  const nodeEls = nodes
    .map((n) => {
      const p = pos.get(n.id);
      if (!p) return "";
      const risk =
        n.verificationStatus === "proven-risk" || (n.risks && n.risks.length);
      return `
        <g class="map-node ${risk ? "risk" : ""}" data-id="${escapeXml(n.id)}" transform="translate(${p.x - nodeW / 2}, ${p.y - nodeH / 2})">
          <rect width="${nodeW}" height="${nodeH}" rx="2" />
          <text class="type-label" x="8" y="14">${escapeXml(n.type)}</text>
          <text x="8" y="30">${escapeXml(truncate(n.label, 18))}</text>
        </g>
      `;
    })
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Engineering architecture map">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a97a6" />
        </marker>
      </defs>
      ${edgeEls}
      ${nodeEls}
    </svg>
  `;

  let selected = null;

  function select(id) {
    selected = id;
    container.querySelectorAll(".map-node").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.id === id);
    });
    const node = nodes.find((n) => n.id === id) || null;
    onSelect?.(node);
  }

  container.querySelectorAll(".map-node").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      select(el.dataset.id);
    });
  });

  container.querySelector("svg")?.addEventListener("click", () => select(null));

  const firstRisk =
    nodes.find((n) => n.verificationStatus === "proven-risk") || nodes[0];
  if (firstRisk) select(firstRisk.id);

  return { select };
}
