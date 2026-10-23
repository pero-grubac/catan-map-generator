import { MODE_RESOURCES, MODE_NUMBERS } from "./constants.js";
import {
  getRowCounts,
  buildGrid,
  buildNeighborCache,
  buildVertices,
} from "./grid.js";
import {
  generateBestMap,
  scoreMap,
  checkRules,
  pipSummary,
} from "./generator.js";
import { renderMap, renderInfo, renderWarnings } from "./render.js";
import { encodeMap, decodeMap } from "./share.js";
import { svgToPngBlob, downloadBlob } from "./export.js";

// ─── UI state ─────────────────────────────────────────────────────────────────

let currentMode = "standard";
let generationId = 0;
let current = null; // the map on screen: { mode, hexes, rowCounts, resourceArr, numberArr, … }

const RULE_INPUTS = {
  no68: "no-68-adjacent",
  no212: "no-212-adjacent",
  noSameRes: "no-same-resource-adjacent",
};

function readRules() {
  const rules = {};
  for (const [k, id] of Object.entries(RULE_INPUTS))
    rules[k] = document.getElementById(id).checked;
  return rules;
}

function writeRules(rules) {
  for (const [k, id] of Object.entries(RULE_INPUTS))
    document.getElementById(id).checked = rules[k];
}

function showMode(mode) {
  currentMode = mode;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + mode).classList.add("active");
  document
    .querySelectorAll(".legend-knights")
    .forEach((e) => (e.style.display = mode === "knights" ? "" : "none"));
}

function setMode(mode) {
  showMode(mode);
  generateMap();
}

function board(mode) {
  const rowCounts = getRowCounts(mode);
  const hexes = buildGrid(rowCounts);
  return {
    rowCounts,
    hexes,
    nc: buildNeighborCache(hexes, rowCounts),
    vertices: buildVertices(hexes, rowCounts),
  };
}

function generateMap() {
  const myId = ++generationId;
  const mode = currentMode;
  const rules = readRules();
  const { rowCounts, hexes, nc, vertices } = board(mode);

  const available = { ...MODE_RESOURCES[mode] };
  const numbers = MODE_NUMBERS[mode];

  setGenerating(true);

  // Yield to browser so the button disables before the (synchronous) generation starts
  setTimeout(() => {
    if (generationId !== myId) return;

    const result = generateBestMap({ hexes, nc, available, numbers, ...rules });

    if (generationId !== myId) return;

    setGenerating(false);
    show({ mode, rules, hexes, rowCounts, vertices, ...result });
    renderWarnings(result);
    history.replaceState(null, "", "#" + encodeMap({ mode, rules, ...result }));
  }, 0);
}

// Renders a map exactly as stored in a share link, without generating
function openSharedMap(code) {
  const map = decodeMap(code);
  if (!map) return false;
  generationId++; // drop any generation still pending
  setGenerating(false);
  showMode(map.mode);
  writeRules(map.rules);
  const { rowCounts, hexes, nc, vertices } = board(map.mode);
  show({
    ...map,
    hexes,
    rowCounts,
    vertices,
    shared: true,
    score: scoreMap(hexes, nc, map.resourceArr, map.numberArr),
    valid: checkRules(nc, map.resourceArr, map.numberArr, map.rules),
  });
  renderWarnings({ usedFallback: false });
  return true;
}

function show(map) {
  const summary = pipSummary(map.vertices, map.resourceArr, map.numberArr);
  current = { ...map, summary };
  drawCurrent();
  renderInfo(current);
}

function drawCurrent() {
  if (!current) return;
  const showStrength = document.getElementById("show-strength").checked;
  renderMap({ ...current, pips: current.summary.totals, showStrength });
  document
    .querySelectorAll(".legend-strength")
    .forEach((e) => (e.style.display = showStrength ? "" : "none"));
}

function setGenerating(on) {
  const btn = document.querySelector(".btn-generate");
  btn.disabled = on;
  btn.textContent = on ? "⏳ Generating…" : "🎲 Generate Map";
}

// ─── Share, export ────────────────────────────────────────────────────────────

let toastTimer = 0;

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

async function shareLink() {
  if (!current) return;
  const url = location.href;
  // Phones get the system share sheet, desktops a plain copy
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title: document.title, url });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("🔗 Link copied");
  } catch {
    toast("Couldn't copy, the link is in the address bar");
  }
}

async function exportPng() {
  if (!current) return;
  const btn = document.getElementById("btn-png");
  btn.disabled = true;
  try {
    const blob = await svgToPngBlob(document.getElementById("map-svg"));
    downloadBlob(blob, `catan-${current.mode}-map.png`);
  } catch {
    toast("PNG export isn't supported in this browser");
  } finally {
    btn.disabled = false;
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
// Module scripts are deferred, so the DOM is already parsed here.

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});
document.querySelector(".btn-generate").addEventListener("click", generateMap);
document.getElementById("btn-share").addEventListener("click", shareLink);
document.getElementById("btn-png").addEventListener("click", exportPng);
document.getElementById("show-strength").addEventListener("change", drawCurrent);

// "?" next to the strength toggle: opens and closes the explanation
const infoBtn = document.getElementById("strength-info-btn");
const infoPanel = document.getElementById("strength-info");
function setInfoOpen(open) {
  infoPanel.hidden = !open;
  infoBtn.setAttribute("aria-expanded", String(open));
}
infoBtn.addEventListener("click", () => setInfoOpen(infoPanel.hidden));
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !infoPanel.hidden) {
    setInfoOpen(false);
    infoBtn.focus();
  }
});

// A link pasted into an open tab only changes the hash
addEventListener("hashchange", () => {
  if (current && location.hash.slice(1) === encodeMap(current)) return;
  openSharedMap(location.hash);
});

if (!openSharedMap(location.hash)) {
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  generateMap();
}
