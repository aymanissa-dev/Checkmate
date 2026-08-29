import { loadAnalysis, loadComparison } from "./load.js";
import { shipStatus } from "./derive.js";
import {
  renderOverview,
  renderMapView,
  renderRoadmap,
  renderProofs,
  renderChanges,
  renderEval,
} from "./views.js";

const VIEWS = ["overview", "map", "roadmap", "proofs", "changes", "eval"];

const content = document.getElementById("content");
const nav = document.getElementById("nav");
const menuBtn = document.getElementById("menu-btn");
const backdrop = document.getElementById("nav-backdrop");
const rail = document.querySelector(".rail");

let analysis = null;
let comparison = null;

function currentView() {
  const hash = (location.hash || "#overview").slice(1).toLowerCase();
  return VIEWS.includes(hash) ? hash : "overview";
}

function setActiveNav(view) {
  nav.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.view === view);
  });
}

function closeMenu() {
  rail?.classList.remove("is-open");
  if (backdrop) backdrop.hidden = true;
}

function openMenu() {
  rail?.classList.add("is-open");
  if (backdrop) backdrop.hidden = false;
}

function paintChrome() {
  if (!analysis) return;
  const m = analysis.manifest;
  const ship = shipStatus(analysis);
  document.getElementById("rail-analysis-id").textContent = m.analysisId;
  document.getElementById("rail-mode").textContent = `${m.label} / ${m.mode}`;
  document.getElementById("case-line").textContent =
    `${m.caseId} · ${m.analysisId}`;
  document.getElementById("repo-line").textContent = m.repoLabel || "";
  const pill = document.getElementById("ship-pill");
  pill.textContent = ship.label;
  pill.className =
    "pill " +
    (ship.status === "blocked"
      ? "blocked"
      : ship.status === "ready"
        ? "ready"
        : "mock");
}

function render() {
  const view = currentView();
  setActiveNav(view);
  paintChrome();
  if (!analysis) {
    content.innerHTML = `<p class="loading">Failed to load analysis.</p>`;
    return;
  }
  switch (view) {
    case "map":
      renderMapView(content, analysis);
      break;
    case "roadmap":
      renderRoadmap(content, analysis);
      break;
    case "proofs":
      renderProofs(content, analysis);
      break;
    case "changes":
      renderChanges(content, analysis);
      break;
    case "eval":
      renderEval(content, comparison);
      break;
    default:
      renderOverview(content, analysis);
  }
  closeMenu();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

menuBtn?.addEventListener("click", () => {
  if (rail?.classList.contains("is-open")) closeMenu();
  else openMenu();
});
backdrop?.addEventListener("click", closeMenu);

window.addEventListener("hashchange", render);

try {
  ;[analysis, comparison] = await Promise.all([
    loadAnalysis(),
    loadComparison(),
  ]);
  if (!location.hash) location.hash = "#overview";
  render();
} catch (err) {
  content.innerHTML = `<p class="loading">${err instanceof Error ? err.message : String(err)}</p>`;
  console.error(err);
}
