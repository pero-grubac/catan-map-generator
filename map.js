// ─── Resource & number data ───────────────────────────────────────────────────

const RESOURCE_COLORS = {
  forest: { fill: "#3d6b1a", stroke: "#2a4d0f", label: "Forest", icon: "🌲" },
  fields: { fill: "#c8a840", stroke: "#a08020", label: "Fields", icon: "🌾" },
  pasture: { fill: "#7ab828", stroke: "#558a10", label: "Pasture", icon: "🐑" },
  mountains: {
    fill: "#7a5030",
    stroke: "#5a3820",
    label: "Mountains",
    icon: "⛰️",
  },
  hills: { fill: "#c86030", stroke: "#a04020", label: "Hills", icon: "🧱" },
  desert: { fill: "#d8c878", stroke: "#b8a858", label: "Desert", icon: "🏜️" },
  gold: { fill: "#e8a820", stroke: "#c08010", label: "Gold", icon: "💰" },
};

const NUMBER_DOTS = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};
const HOT_NUMBERS = new Set([6, 8]);
const RARE_NUMBERS = new Set([2, 12]);

// Standard (3-4 players): 19 land tiles
const STANDARD_RESOURCES = [
  "forest",
  "forest",
  "forest",
  "forest",
  "fields",
  "fields",
  "fields",
  "fields",
  "pasture",
  "pasture",
  "pasture",
  "pasture",
  "mountains",
  "mountains",
  "mountains",
  "hills",
  "hills",
  "hills",
  "desert",
];
const STANDARD_NUMBERS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

// Extended (5-6 players): 30 land tiles
// Note: 7 resource types on 30 densely-connected hexes makes "no same resource adjacent"
// mathematically near-impossible. The constraint is ignored with a warning for this mode.
const EXTENDED_RESOURCES = [
  "forest",
  "forest",
  "forest",
  "forest",
  "forest",
  "forest",
  "fields",
  "fields",
  "fields",
  "fields",
  "fields",
  "fields",
  "pasture",
  "pasture",
  "pasture",
  "pasture",
  "pasture",
  "pasture",
  "mountains",
  "mountains",
  "mountains",
  "mountains",
  "hills",
  "hills",
  "hills",
  "hills",
  "hills",
  "desert",
  "desert",
  "gold",
  "gold",
];
const EXTENDED_NUMBERS = [
  2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11,
  11, 11, 12, 12,
];

// ─── Hex grid ─────────────────────────────────────────────────────────────────

function getRowCounts(mode) {
  return mode === "standard" ? [3, 4, 5, 4, 3] : [3, 4, 5, 6, 5, 4, 3];
}

function buildHexGrid(rowCounts) {
  const hexes = [];
  let id = 0;
  for (let r = 0; r < rowCounts.length; r++)
    for (let c = 0; c < rowCounts[r]; c++) hexes.push({ id: id++, r, c });
  return hexes;
}

function rcToIndex(rowCounts, r, c) {
  if (r < 0 || r >= rowCounts.length) return -1;
  if (c < 0 || c >= rowCounts[r]) return -1;
  let idx = 0;
  for (let i = 0; i < r; i++) idx += rowCounts[i];
  return idx + c;
}

/**
 * Returns the 6 neighbour indices for hex at flat index `hid`.
 *
 * Layout: pointy-top hexes, offset grid.
 * For a hex at (r, c):
 *   Same row: (r, c±1)
 *   Row above is WIDER  → neighbours are (r-1, c) and (r-1, c+1)
 *   Row above is NARROWER → neighbours are (r-1, c-1) and (r-1, c)
 *   (mirror logic for row below)
 */
function getNeighbors(hexes, rowCounts, hid) {
  const { r, c } = hexes[hid];
  const cur = rowCounts[r];
  const above = r > 0 ? rowCounts[r - 1] : -1;
  const below = r < rowCounts.length - 1 ? rowCounts[r + 1] : -1;

  const cands = [
    rcToIndex(rowCounts, r, c - 1),
    rcToIndex(rowCounts, r, c + 1),
  ];

  if (above > cur) {
    cands.push(rcToIndex(rowCounts, r - 1, c));
    cands.push(rcToIndex(rowCounts, r - 1, c + 1));
  } else if (above !== -1) {
    cands.push(rcToIndex(rowCounts, r - 1, c - 1));
    cands.push(rcToIndex(rowCounts, r - 1, c));
  }

  if (below > cur) {
    cands.push(rcToIndex(rowCounts, r + 1, c));
    cands.push(rcToIndex(rowCounts, r + 1, c + 1));
  } else if (below !== -1) {
    cands.push(rcToIndex(rowCounts, r + 1, c - 1));
    cands.push(rcToIndex(rowCounts, r + 1, c));
  }

  return cands.filter((x) => x !== -1);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Generation ───────────────────────────────────────────────────────────────

let currentMode = "standard";
let generationId = 0; // used to cancel in-flight generation if user clicks again

function setMode(mode) {
  currentMode = mode;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + mode).classList.add("active");
  generateMap();
}

function generateMap() {
  // Cancel any previous run
  const myId = ++generationId;

  const no68 = document.getElementById("no-68-adjacent").checked;
  const no212 = document.getElementById("no-212-adjacent").checked;
  const noSameRes = document.getElementById(
    "no-same-resource-adjacent",
  ).checked;

  const rowCounts = getRowCounts(currentMode);
  const hexes = buildHexGrid(rowCounts);
  const total = hexes.length;

  const baseResources =
    currentMode === "standard" ? STANDARD_RESOURCES : EXTENDED_RESOURCES;
  const baseNumbers =
    currentMode === "standard" ? STANDARD_NUMBERS : EXTENDED_NUMBERS;

  // Extended map: "no same resource" is geometrically infeasible with only 7 types on 30 tiles.
  const extendedSameResWarning = noSameRes && currentMode === "extended";
  const applySameRes = noSameRes && currentMode === "standard";

  const neighborCache = hexes.map((_, i) => getNeighbors(hexes, rowCounts, i));

  // Show searching state
  setGenerating(true);
  renderWarnings(true, extendedSameResWarning);

  // Time-based limit: keep trying for up to TIMEOUT_MS before giving up.
  // We yield to the browser every CHUNK attempts so the page stays responsive.
  const TIMEOUT_MS = 3000;
  const CHUNK = 500; // attempts per tick before yielding

  const deadline = performance.now() + TIMEOUT_MS;
  let attempt = 0;
  let bestResult = null; // best-effort fallback built on first attempt

  function tryChunk() {
    // If the user triggered a new generation, abandon this one
    if (generationId !== myId) return;

    const chunkEnd = Math.min(attempt + CHUNK, Infinity);

    while (attempt < chunkEnd) {
      attempt++;

      const resourceArr = shuffle(baseResources);

      // Build fallback on very first attempt (no constraints)
      if (attempt === 1) {
        const li = resourceArr.reduce(
          (a, r, i) => (r !== "desert" && r !== "gold" ? [...a, i] : a),
          [],
        );
        const na = new Array(total).fill(null);
        shuffle(baseNumbers).forEach((n, ni) => {
          na[li[ni]] = n;
        });
        bestResult = { resourceArr: [...resourceArr], numberArr: na };
      }

      // Same-resource check
      if (applySameRes) {
        let ok = true;
        for (let i = 0; i < total && ok; i++)
          for (const n of neighborCache[i])
            if (n > i && resourceArr[i] === resourceArr[n]) {
              ok = false;
              break;
            }
        if (!ok) continue;
      }

      // Assign numbers
      const landIndices = resourceArr.reduce(
        (acc, r, i) => (r !== "desert" && r !== "gold" ? [...acc, i] : acc),
        [],
      );
      const shuffledNums = shuffle(baseNumbers);
      const numberArr = new Array(total).fill(null);
      landIndices.forEach((ti, ni) => {
        numberArr[ti] = shuffledNums[ni];
      });

      // Hot/rare adjacency check
      if (no68 || no212) {
        let ok = true;
        for (let i = 0; i < total && ok; i++) {
          if (numberArr[i] === null) continue;
          for (const n of neighborCache[i]) {
            if (n <= i || numberArr[n] === null) continue;
            const a = numberArr[i],
              b = numberArr[n];
            if (no68 && HOT_NUMBERS.has(a) && HOT_NUMBERS.has(b)) {
              ok = false;
              break;
            }
            if (no212 && RARE_NUMBERS.has(a) && RARE_NUMBERS.has(b)) {
              ok = false;
              break;
            }
          }
        }
        if (!ok) continue;
      }

      // Valid solution found
      setGenerating(false);
      renderMap({ hexes, rowCounts, resourceArr, numberArr });
      renderInfo(attempt, true, performance.now() - deadline + TIMEOUT_MS);
      renderWarnings(true, extendedSameResWarning);
      return;
    }

    // Check if time is still available
    if (performance.now() < deadline) {
      setTimeout(tryChunk, 0); // yield, then continue
    } else {
      // Timed out — render best-effort
      setGenerating(false);
      renderMap({ hexes, rowCounts, ...bestResult });
      renderInfo(attempt, false, TIMEOUT_MS);
      renderWarnings(false, extendedSameResWarning);
    }
  }

  setTimeout(tryChunk, 0);
}

function setGenerating(on) {
  const btn = document.querySelector(".btn-generate");
  btn.disabled = on;
  btn.textContent = on ? "⏳ Searching…" : "🎲 Generate Map";
}

// ─── SVG rendering ────────────────────────────────────────────────────────────

function hexCorners(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // pointy-top
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function hexPixel(r, c, rowCounts, S) {
  const maxCols = Math.max(...rowCounts);
  const dx = Math.sqrt(3) * S;
  const dy = 1.5 * S;
  const rowWidth = rowCounts[r] * dx;
  const totalWidth = maxCols * dx;
  const xOffset = (totalWidth - rowWidth) / 2;
  return { x: xOffset + c * dx + dx / 2, y: r * dy + S };
}

function el(tag, attrs, textContent) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (textContent !== undefined) e.textContent = textContent;
  return e;
}

function renderMap({ hexes, rowCounts, resourceArr, numberArr }) {
  const svg = document.getElementById("map-svg");
  const S = currentMode === "standard" ? 64 : 54;
  const PAD = S * 1.3;
  const maxCols = Math.max(...rowCounts);
  const dx = Math.sqrt(3) * S;
  const dy = 1.5 * S;
  const W = maxCols * dx + PAD * 2;
  const H = (rowCounts.length - 1) * dy + S * 2 + PAD * 2;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", Math.round(W));
  svg.setAttribute("height", Math.round(H));
  svg.innerHTML = "";

  // Sea background
  svg.appendChild(el("rect", { width: W, height: H, fill: "#0d2238" }));

  // Wave pattern
  const waves = el("g", { opacity: "0.1" });
  for (let wy = 16; wy < H; wy += 22)
    for (let wx = 0; wx < W; wx += 34) {
      const p = el("path", {
        d: `M${wx},${wy} q9,-5 18,0 q9,5 18,0`,
        stroke: "#4a9acc",
        "stroke-width": "1",
        fill: "none",
      });
      waves.appendChild(p);
    }
  svg.appendChild(waves);

  hexes.forEach((hex, i) => {
    const resource = resourceArr[i];
    const number = numberArr[i];
    const { x: rx, y: ry } = hexPixel(hex.r, hex.c, rowCounts, S);
    const cx = rx + PAD,
      cy = ry + PAD;
    const rc = RESOURCE_COLORS[resource] || RESOURCE_COLORS.desert;

    const g = el("g", {});

    // Shadow
    g.appendChild(
      el("polygon", {
        points: hexCorners(cx + 1, cy + 2, S),
        fill: "rgba(0,0,0,0.28)",
        stroke: "none",
      }),
    );
    // Hex face
    g.appendChild(
      el("polygon", {
        points: hexCorners(cx, cy, S - 1),
        fill: rc.fill,
        stroke: rc.stroke,
        "stroke-width": "2",
      }),
    );
    // Inner highlight
    g.appendChild(
      el("polygon", {
        points: hexCorners(cx, cy, S - 5),
        fill: "none",
        stroke: "rgba(255,255,255,0.08)",
        "stroke-width": "1",
      }),
    );

    // Icon
    const iconSz = Math.round(S * 0.46);
    g.appendChild(
      el(
        "text",
        {
          x: cx,
          y: cy + iconSz * 0.35,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-size": `${iconSz}px`,
        },
        rc.icon,
      ),
    );

    // Resource label
    if (resource !== "sea") {
      g.appendChild(
        el(
          "text",
          {
            x: cx,
            y: cy - S * 0.52,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-family": "Crimson Pro, serif",
            "font-size": `${Math.round(S * 0.165)}px`,
            "font-weight": "500",
            fill: "rgba(255,255,220,0.65)",
            "letter-spacing": "0.04em",
          },
          rc.label.toUpperCase(),
        ),
      );
    }

    // Number token
    if (number !== null && resource !== "sea") {
      const isHot = HOT_NUMBERS.has(number);
      const isRare = RARE_NUMBERS.has(number);
      const tokR = Math.round(S * 0.27);
      const tokCY = cy + S * 0.3;

      g.appendChild(
        el("circle", {
          cx: cx + 1,
          cy: tokCY + 2,
          r: tokR,
          fill: "rgba(0,0,0,0.4)",
        }),
      );
      g.appendChild(
        el("circle", {
          cx: cx,
          cy: tokCY,
          r: tokR,
          fill: isHot ? "#cc1a1a" : isRare ? "#9a7020" : "#f0e8cc",
          stroke: isHot ? "#ff6060" : isRare ? "#e0b84a" : "#c0b090",
          "stroke-width": "1.5",
        }),
      );
      g.appendChild(
        el(
          "text",
          {
            x: cx,
            y: tokCY,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-family": "Cinzel, serif",
            "font-size": `${Math.round(S * 0.22)}px`,
            "font-weight": "700",
            fill: isHot || isRare ? "#fff" : "#1a0e04",
          },
          String(number),
        ),
      );

      // Probability dots
      const dots = NUMBER_DOTS[number] || 1;
      const dotR = 1.6,
        dotSp = 4;
      const dotY = tokCY + tokR * 0.52;
      const totalW = (dots - 1) * dotSp;
      for (let d = 0; d < dots; d++) {
        g.appendChild(
          el("circle", {
            cx: cx - totalW / 2 + d * dotSp,
            cy: dotY,
            r: dotR,
            fill: isHot ? "#ff9090" : isRare ? "#e0c070" : "#5a3a10",
          }),
        );
      }
    }

    svg.appendChild(g);
  });
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function renderInfo(attempts, success, elapsedMs) {
  const mode =
    currentMode === "standard" ? "Standard (3-4p)" : "Extended (5-6p)";
  const timeStr =
    elapsedMs < 1
      ? "<1ms"
      : elapsedMs < 1000
        ? `${Math.round(elapsedMs)}ms`
        : `${(elapsedMs / 1000).toFixed(1)}s`;
  document.getElementById("info-bar").innerHTML = `
    <div class="info-pill">Mode: <span>${mode}</span></div>
    <div class="info-pill">Attempts: <span>${attempts.toLocaleString()}</span></div>
    <div class="info-pill">Time: <span>${timeStr}</span></div>
    <div class="info-pill">Status: <span style="color:${success ? "#80c840" : "#f08040"}">${success ? "Valid ✓" : "Best effort"}</span></div>
  `;
}

function renderWarnings(success, extendedSameResWarning) {
  const c = document.getElementById("warning-container");
  const msgs = [];
  if (extendedSameResWarning) {
    msgs.push(
      '⚠️ "No same resource adjacent" nije primjenjivo na Extended mapu — 7 tipova resursa nije dovoljno za 30 heksova u ovako gustoj mreži. Ostala pravila su primijenjena.',
    );
  }
  if (!success) {
    msgs.push(
      "⚠️ Nije pronađeno rješenje za 3 sekunde. Prikazuje se best-effort raspored — pokušaj isključiti neka pravila.",
    );
  }
  c.innerHTML = msgs.map((m) => `<div class="warning-box">${m}</div>`).join("");
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  generateMap();
});
