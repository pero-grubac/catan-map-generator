import { MODE_RESOURCES, MODE_NUMBERS } from "./constants.js";
import { getRowCounts, buildGrid, buildNeighborCache } from "./grid.js";
import { generateBestMap } from "./generator.js";
import { renderMap, renderInfo, renderWarnings } from "./render.js";

// ─── UI state ─────────────────────────────────────────────────────────────────

let currentMode = "standard";
let generationId = 0;

function setMode(mode) {
  currentMode = mode;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + mode).classList.add("active");
  document
    .querySelectorAll(".legend-knights")
    .forEach((e) => (e.style.display = mode === "knights" ? "" : "none"));
  generateMap();
}

function generateMap() {
  const myId = ++generationId;
  const mode = currentMode;

  const no68 = document.getElementById("no-68-adjacent").checked;
  const no212 = document.getElementById("no-212-adjacent").checked;
  const noSameRes = document.getElementById(
    "no-same-resource-adjacent",
  ).checked;

  const rowCounts = getRowCounts(mode);
  const hexes = buildGrid(rowCounts);
  const nc = buildNeighborCache(hexes, rowCounts);

  const available = { ...MODE_RESOURCES[mode] };
  const numbers = MODE_NUMBERS[mode];

  setGenerating(true);

  // Yield to browser so the button disables before the (synchronous) generation starts
  setTimeout(() => {
    if (generationId !== myId) return;

    const result = generateBestMap({
      hexes,
      nc,
      available,
      numbers,
      no68,
      no212,
      noSameRes,
    });

    if (generationId !== myId) return;

    setGenerating(false);
    renderMap({ mode, hexes, rowCounts, ...result });
    renderInfo({ mode, ...result });
    renderWarnings(result);
  }, 0);
}

function setGenerating(on) {
  const btn = document.querySelector(".btn-generate");
  btn.disabled = on;
  btn.textContent = on ? "⏳ Generating…" : "🎲 Generate Map";
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
// Module scripts are deferred, so the DOM is already parsed here.

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});
document.querySelector(".btn-generate").addEventListener("click", generateMap);

generateMap();
