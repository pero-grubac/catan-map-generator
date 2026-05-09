// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCE_COLORS = {
  forest: { fill: "#3d6b1a", stroke: "#2a4d0f", label: "Forest", icon: "🌲" },
  fields: { fill: "#c8a840", stroke: "#a08020", label: "Grain", icon: "🌾" },
  pasture: { fill: "#7ab828", stroke: "#558a10", label: "Sheep", icon: "🐑" },
  mountains: { fill: "#7a5030", stroke: "#5a3820", label: "Rock", icon: "⛰️" },
  hills: { fill: "#c86030", stroke: "#a04020", label: "Clay", icon: "🧱" },
  desert: { fill: "#d8c878", stroke: "#b8a858", label: "Desert", icon: "🏜️" },
};

const NUM_DOTS = {
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
const HOT = new Set([6, 8]);
const RARE = new Set([2, 12]);

// Standard (3-4p): 19 land tiles
const STD_RESOURCES = {
  forest: 4,
  fields: 4,
  pasture: 4,
  mountains: 3,
  hills: 3,
  desert: 1,
};
const STD_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// Extended (5-6p): 30 land tiles, no gold, 2 deserts
const EXT_RESOURCES = {
  forest: 6,
  fields: 6,
  pasture: 6,
  mountains: 5,
  hills: 5,
  desert: 2,
};
const EXT_NUMBERS = [
  2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11,
  11, 11, 12, 12,
];

// ─── Ports ────────────────────────────────────────────────────────────────────
// Each port: { r, c } = the land hex it faces, edge = which side (0=NE,1=E,2=SE,3=SW,4=W,5=NW)
// Port types are shuffled each generation for variety.

// ─── Ports ────────────────────────────────────────────────────────────────────
// Port positions are FIXED per official Catan layout.
// Each entry: { r, c } = land hex, edge = exposed side, type data fixed.

const STD_PORT_POSITIONS = [
  { r: 0, c: 0, edge: 5, label: "2:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 0, c: 1, edge: 0, label: "2:1", icon: "🌾", color: "#c8a840" }, // Grain
  { r: 0, c: 2, edge: 0, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 1, c: 3, edge: 1, label: "2:1", icon: "⛰️", color: "#7a5030" }, // Rock
  { r: 2, c: 4, edge: 2, label: "2:1", icon: "🌲", color: "#3d6b1a" }, // Forest
  { r: 3, c: 3, edge: 2, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 4, c: 2, edge: 3, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 4, c: 0, edge: 3, label: "2:1", icon: "🐑", color: "#7ab828" }, // Sheep
  { r: 2, c: 0, edge: 4, label: "2:1", icon: "🧱", color: "#c86030" }, // Clay
];

const EXT_PORT_POSITIONS = [
  { r: 0, c: 0, edge: 5, label: "2:1", icon: "🌲", color: "#3d6b1a" }, // Forest
  { r: 0, c: 1, edge: 0, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 0, c: 2, edge: 0, label: "2:1", icon: "🌾", color: "#c8a840" }, // Grain
  { r: 1, c: 3, edge: 0, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 2, c: 4, edge: 1, label: "2:1", icon: "⛰️", color: "#7a5030" }, // Rock
  { r: 3, c: 5, edge: 1, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 4, c: 4, edge: 2, label: "2:1", icon: "🐑", color: "#7ab828" }, // Sheep
  { r: 5, c: 3, edge: 2, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 6, c: 2, edge: 3, label: "2:1", icon: "🧱", color: "#c86030" }, // Clay
  { r: 6, c: 0, edge: 3, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
  { r: 3, c: 0, edge: 4, label: "3:1", icon: "⛵", color: "#2a5f8a" }, // 3:1 generic
];

// Outward angle (degrees) for each edge direction
const EDGE_ANGLE = [30, 90, 150, 210, 270, 330]; // NE,E,SE,SW,W,NW

// ─── Grid ─────────────────────────────────────────────────────────────────────

function getRowCounts(mode) {
  return mode === "standard" ? [3, 4, 5, 4, 3] : [3, 4, 5, 6, 5, 4, 3];
}

function buildGrid(rowCounts) {
  const hexes = [];
  let id = 0;
  for (let r = 0; r < rowCounts.length; r++)
    for (let c = 0; c < rowCounts[r]; c++) hexes.push({ id: id++, r, c });
  return hexes;
}

function rcToIdx(rowCounts, r, c) {
  if (r < 0 || r >= rowCounts.length || c < 0 || c >= rowCounts[r]) return -1;
  let idx = 0;
  for (let i = 0; i < r; i++) idx += rowCounts[i];
  return idx + c;
}

function buildNeighborCache(hexes, rowCounts) {
  return hexes.map(({ r, c }) => {
    const cur = rowCounts[r];
    const above = r > 0 ? rowCounts[r - 1] : -1;
    const below = r < rowCounts.length - 1 ? rowCounts[r + 1] : -1;
    const cands = [rcToIdx(rowCounts, r, c - 1), rcToIdx(rowCounts, r, c + 1)];
    if (above > cur) {
      cands.push(
        rcToIdx(rowCounts, r - 1, c),
        rcToIdx(rowCounts, r - 1, c + 1),
      );
    } else if (above !== -1) {
      cands.push(
        rcToIdx(rowCounts, r - 1, c - 1),
        rcToIdx(rowCounts, r - 1, c),
      );
    }
    if (below > cur) {
      cands.push(
        rcToIdx(rowCounts, r + 1, c),
        rcToIdx(rowCounts, r + 1, c + 1),
      );
    } else if (below !== -1) {
      cands.push(
        rcToIdx(rowCounts, r + 1, c - 1),
        rcToIdx(rowCounts, r + 1, c),
      );
    }
    return cands.filter((x) => x !== -1);
  });
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

// ─── Backtracking: resources ──────────────────────────────────────────────────
// Visits hexes in a random order (shuffled before each run) so rare resources
// like desert are never biased toward the end of the grid.
// Resource types are tried in fully random order at each hex.
// Guarantees no same-resource adjacency.

function btResources(hexes, nc, available) {
  const total = hexes.length;
  const assigned = new Array(total).fill(null); // indexed by hex id
  const rem = { ...available };

  // Shuffle the visit order so every hex has equal chance of getting any resource
  const visitOrder = shuffle([...Array(total).keys()]);

  function bt(step) {
    if (step === total) return true;

    const pos = visitOrder[step];
    const types = shuffle(Object.keys(rem).filter((r) => rem[r] > 0));

    for (const res of types) {
      // Check against already-assigned neighbours (only those visited before this step)
      let valid = true;
      for (const n of nc[pos]) {
        if (assigned[n] === res) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      assigned[pos] = res;
      rem[res]--;
      if (bt(step + 1)) return true;
      assigned[pos] = null;
      rem[res]++;
    }
    return false;
  }

  return bt(0) ? [...assigned] : null;
}

// ─── Backtracking: numbers ───────────────────────────────────────────────────
// Slots sorted by degree desc (hardest first → less backtracking).
// Aborts early if `deadline` is exceeded so caller can restart fresh.

function btNumbers(hexes, nc, resourceArr, pool, no68, no212, deadline) {
  const landIdx = resourceArr.reduce(
    (a, r, i) => (r !== "desert" ? [...a, i] : a),
    [],
  );
  // Highest-degree land tiles first
  landIdx.sort((a, b) => nc[b].length - nc[a].length);

  const assigned = new Array(hexes.length).fill(null);
  const nums = shuffle([...pool]);
  const used = new Array(nums.length).fill(false);
  let aborted = false;

  function bt(slot) {
    if (aborted) return false;
    if (Date.now() > deadline) {
      aborted = true;
      return false;
    }
    if (slot === landIdx.length) return true;

    const hi = landIdx[slot];
    const order = shuffle([...nums.keys()].filter((i) => !used[i]));

    for (const ni of order) {
      const num = nums[ni];
      let valid = true;
      for (const n of nc[hi]) {
        const b = assigned[n];
        if (b === null) continue;
        if (no68 && HOT.has(num) && HOT.has(b)) {
          valid = false;
          break;
        }
        if (no212 && RARE.has(num) && RARE.has(b)) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      assigned[hi] = num;
      used[ni] = true;
      if (bt(slot + 1)) return true;
      assigned[hi] = null;
      used[ni] = false;
    }
    return false;
  }

  return !bt(0) || aborted ? null : [...assigned];
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
// Lower is worse, higher is better. Zero = perfect.

function scoreMap(hexes, nc, resourceArr, numberArr) {
  let score = 0;

  for (let i = 0; i < hexes.length; i++) {
    for (const n of nc[i]) {
      if (n <= i) continue;
      if (resourceArr[i] === resourceArr[n]) score -= 20;
      if (
        numberArr[i] &&
        numberArr[n] &&
        HOT.has(numberArr[i]) &&
        HOT.has(numberArr[n])
      )
        score -= 100;
      if (
        numberArr[i] &&
        numberArr[n] &&
        RARE.has(numberArr[i]) &&
        RARE.has(numberArr[n])
      )
        score -= 40;
    }
  }

  // Penalise unbalanced probability distribution per resource type
  const prob = {};
  for (let i = 0; i < hexes.length; i++) {
    if (!numberArr[i]) continue;
    const r = resourceArr[i];
    prob[r] = (prob[r] || 0) + NUM_DOTS[numberArr[i]];
  }
  const vals = Object.values(prob);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
  score -= Math.round(variance);

  return score;
}

// ─── Generate best map ────────────────────────────────────────────────────────
// Strategy:
//   1. Backtrack resources (guaranteed valid if constraints enabled)
//   2. Backtrack numbers with a per-attempt deadline; restart if deadline hit
//   3. Collect up to TARGET candidates within TOTAL_TIMEOUT, return highest-scored

function generateBestMap({
  hexes,
  nc,
  available,
  numbers,
  no68,
  no212,
  noSameRes,
  totalTimeout = 2500,
  perAttempt = 150,
  target = 8,
}) {
  const candidates = [];
  const globalStart = Date.now();

  // Fallback: first valid placement without number constraints
  let fallback = null;

  while (
    Date.now() - globalStart < totalTimeout &&
    candidates.length < target
  ) {
    // Step 1: resource layout (backtracking if noSameRes, else random)
    let resourceArr;
    if (noSameRes) {
      resourceArr = btResources(hexes, nc, available);
      if (!resourceArr) continue; // shouldn't happen but guard anyway
    } else {
      const flat = Object.entries(available).flatMap(([r, n]) =>
        Array(n).fill(r),
      );
      resourceArr = shuffle(flat);
    }

    // Fallback built from first resource layout (no number constraints)
    if (!fallback) {
      const li = resourceArr.reduce(
        (a, r, i) => (r !== "desert" ? [...a, i] : a),
        [],
      );
      const na = new Array(hexes.length).fill(null);
      shuffle(numbers).forEach((n, ni) => {
        if (li[ni] !== undefined) na[li[ni]] = n;
      });
      fallback = {
        resourceArr: [...resourceArr],
        numberArr: na,
        score: scoreMap(hexes, nc, resourceArr, na),
      };
    }

    // Step 2: number layout
    let numberArr;
    if (no68 || no212) {
      numberArr = btNumbers(
        hexes,
        nc,
        resourceArr,
        numbers,
        no68,
        no212,
        Date.now() + perAttempt,
      );
      if (!numberArr) continue; // timed out, retry
    } else {
      const li = resourceArr.reduce(
        (a, r, i) => (r !== "desert" ? [...a, i] : a),
        [],
      );
      numberArr = new Array(hexes.length).fill(null);
      shuffle(numbers).forEach((n, ni) => {
        if (li[ni] !== undefined) numberArr[li[ni]] = n;
      });
    }

    candidates.push({
      resourceArr,
      numberArr,
      score: scoreMap(hexes, nc, resourceArr, numberArr),
    });
  }

  if (candidates.length === 0)
    return {
      ...fallback,
      attempts: 0,
      elapsed: Date.now() - globalStart,
      usedFallback: true,
    };

  candidates.sort((a, b) => b.score - a.score);
  return {
    ...candidates[0],
    attempts: candidates.length,
    elapsed: Date.now() - globalStart,
    usedFallback: false,
    scoreRange: [candidates[0].score, candidates[candidates.length - 1].score],
  };
}

// ─── UI state ─────────────────────────────────────────────────────────────────

let currentMode = "standard";
let generationId = 0;

function setMode(mode) {
  currentMode = mode;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + mode).classList.add("active");
  generateMap();
}

function generateMap() {
  const myId = ++generationId;

  const no68 = document.getElementById("no-68-adjacent").checked;
  const no212 = document.getElementById("no-212-adjacent").checked;
  const noSameRes = document.getElementById(
    "no-same-resource-adjacent",
  ).checked;

  const rowCounts = getRowCounts(currentMode);
  const hexes = buildGrid(rowCounts);
  const nc = buildNeighborCache(hexes, rowCounts);

  const available =
    currentMode === "standard" ? { ...STD_RESOURCES } : { ...EXT_RESOURCES };
  const numbers = currentMode === "standard" ? STD_NUMBERS : EXT_NUMBERS;

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
    renderMap({ hexes, rowCounts, nc, ...result });
    renderInfo(result);
    renderWarnings(result);
  }, 0);
}

function setGenerating(on) {
  const btn = document.querySelector(".btn-generate");
  btn.disabled = on;
  btn.textContent = on ? "⏳ Generating…" : "🎲 Generate Map";
}

// ─── SVG rendering ────────────────────────────────────────────────────────────

function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
  }).join(" ");
}

function hexPixel(r, c, rowCounts, S) {
  const dx = Math.sqrt(3) * S;
  const maxWidth = Math.max(...rowCounts) * dx;
  const rowWidth = rowCounts[r] * dx;
  const xOffset = (maxWidth - rowWidth) / 2;
  return { x: xOffset + c * dx + dx / 2, y: r * 1.5 * S + S };
}

function svgEl(tag, attrs, text) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

function renderMap({ hexes, rowCounts, nc, resourceArr, numberArr }) {
  const svg = document.getElementById("map-svg");
  const S = currentMode === "standard" ? 64 : 54;
  const DX = Math.sqrt(3) * S;
  const DY = 1.5 * S;
  const PAD = S * 1.1; // enough room so top sea hexes aren't clipped

  // Six neighbour offsets (pointy-top): E, W, SE, SW, NE, NW
  const NEIGH_OFFSETS = [
    { x: DX, y: 0 },
    { x: -DX, y: 0 },
    { x: DX / 2, y: DY },
    { x: -DX / 2, y: DY },
    { x: DX / 2, y: -DY },
    { x: -DX / 2, y: -DY },
  ];
  // Edge index [NE,E,SE,SW,W,NW] → NEIGH_OFFSETS index
  const EDGE_TO_NEIGH = [4, 0, 2, 3, 1, 5];

  // Key function for deduplication (round to nearest int)
  const hkey = (x, y) => `${Math.round(x)},${Math.round(y)}`;

  // Build land hex pixel positions
  const landPixels = hexes.map((h) => {
    const maxCols = Math.max(...rowCounts);
    const xOff = (maxCols * DX - rowCounts[h.r] * DX) / 2;
    return { x: xOff + h.c * DX + DX / 2, y: h.r * DY + S };
  });
  const landSet = new Set(landPixels.map((p) => hkey(p.x, p.y)));

  // Build sea hex ring: one hex step outward from every land hex
  const seaMap = new Map(); // key → {x, y, isPort, portType}
  for (const lp of landPixels) {
    for (const d of NEIGH_OFFSETS) {
      const nx = lp.x + d.x,
        ny = lp.y + d.y,
        k = hkey(nx, ny);
      if (!landSet.has(k) && !seaMap.has(k))
        seaMap.set(k, { x: nx, y: ny, isPort: false, portType: null });
    }
  }

  // Assign fixed port types directly from position definitions
  const portPositions =
    currentMode === "standard" ? STD_PORT_POSITIONS : EXT_PORT_POSITIONS;

  portPositions.forEach((pos) => {
    const lp =
      landPixels[hexes.findIndex((h) => h.r === pos.r && h.c === pos.c)];
    const d = NEIGH_OFFSETS[EDGE_TO_NEIGH[pos.edge]];
    const k = hkey(lp.x + d.x, lp.y + d.y);
    if (seaMap.has(k)) {
      seaMap.get(k).isPort = true;
      seaMap.get(k).portType = pos; // pos itself carries label, icon, color
    }
  });

  // Compute bounding box of all hex CENTRES, then add hex radius as margin
  const allX = [...landPixels, ...seaMap.values()].map((h) => h.x);
  const allY = [...landPixels, ...seaMap.values()].map((h) => h.y);
  const minX = Math.min(...allX),
    maxX = Math.max(...allX);
  const minY = Math.min(...allY),
    maxY = Math.max(...allY);

  // offX/offY shift all coords so minX/minY land at PAD + S (hex radius)
  const offX = PAD + S - minX;
  const offY = PAD + S - minY;
  const W = maxX - minX + S * 2 + PAD * 2;
  const H = maxY - minY + S * 2 + PAD * 2;

  svg.setAttribute("viewBox", `0 0 ${Math.round(W)} ${Math.round(H)}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.innerHTML = "";

  // ── 1. Draw all sea hexes first ──
  for (const sh of seaMap.values()) {
    const cx = sh.x + offX,
      cy = sh.y + offY;

    svg.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx + 1, cy + 2, S - 1),
        fill: "rgba(0,0,0,0.2)",
        stroke: "none",
      }),
    );
    svg.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx, cy, S - 1),
        fill: sh.isPort ? "#1e5a8a" : "#163d5e",
        stroke: sh.isPort ? "#3a8abf" : "#1e5a80",
        "stroke-width": "2",
      }),
    );
    svg.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx, cy, S - 5),
        fill: "none",
        stroke: "rgba(255,255,255,0.06)",
        "stroke-width": "1",
      }),
    );

    if (sh.isPort && sh.portType) {
      const pt = sh.portType;
      const iconSz = Math.round(S * 0.36);
      svg.appendChild(
        svgEl(
          "text",
          {
            x: cx,
            y: cy - S * 0.1,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "font-size": `${iconSz}px`,
          },
          pt.icon,
        ),
      );
      svg.appendChild(
        svgEl(
          "text",
          {
            x: cx,
            y: cy + S * 0.38,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-family": "Cinzel, serif",
            "font-size": `${Math.round(S * 0.19)}px`,
            "font-weight": "700",
            fill: "#f0e6c8",
            "letter-spacing": "0.04em",
          },
          pt.label,
        ),
      );
    }
  }

  // ── 2. Draw land hexes on top ──
  hexes.forEach((hex, i) => {
    const resource = resourceArr[i];
    const number = numberArr[i];
    const lp = landPixels[i];
    const cx = lp.x + offX,
      cy = lp.y + offY;
    const rc = RESOURCE_COLORS[resource] || RESOURCE_COLORS.desert;
    const g = svgEl("g", {});

    g.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx + 1, cy + 2, S),
        fill: "rgba(0,0,0,0.28)",
        stroke: "none",
      }),
    );
    g.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx, cy, S - 1),
        fill: rc.fill,
        stroke: rc.stroke,
        "stroke-width": "2",
      }),
    );
    g.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx, cy, S - 5),
        fill: "none",
        stroke: "rgba(255,255,255,0.08)",
        "stroke-width": "1",
      }),
    );

    const iconSz = Math.round(S * 0.38);

    // Label top
    g.appendChild(
      svgEl(
        "text",
        {
          x: cx,
          y: cy - S * 0.48,
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

    // Icon centre
    g.appendChild(
      svgEl(
        "text",
        {
          x: cx,
          y: cy,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          "font-size": `${iconSz}px`,
        },
        rc.icon,
      ),
    );

    // Token bottom
    if (number !== null && resource !== "desert") {
      const isHot = HOT.has(number);
      const isRare = RARE.has(number);
      const tokR = Math.round(S * 0.25);
      const tokCY = cy + S * 0.52;

      g.appendChild(
        svgEl("circle", {
          cx: cx + 1,
          cy: tokCY + 2,
          r: tokR,
          fill: "rgba(0,0,0,0.4)",
        }),
      );
      g.appendChild(
        svgEl("circle", {
          cx: cx,
          cy: tokCY,
          r: tokR,
          fill: isHot ? "#cc1a1a" : isRare ? "#9a7020" : "#f0e8cc",
          stroke: isHot ? "#ff6060" : isRare ? "#e0b84a" : "#c0b090",
          "stroke-width": "1.5",
        }),
      );
      g.appendChild(
        svgEl(
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

      const dots = NUM_DOTS[number] || 1,
        dotR = 1.6,
        dotSp = 4;
      const dotY = tokCY + tokR * 0.52,
        totalW = (dots - 1) * dotSp;
      for (let d = 0; d < dots; d++)
        g.appendChild(
          svgEl("circle", {
            cx: cx - totalW / 2 + d * dotSp,
            cy: dotY,
            r: dotR,
            fill: isHot ? "#ff9090" : isRare ? "#e0c070" : "#5a3a10",
          }),
        );
    }

    svg.appendChild(g);
  });
}

// ─── Info & warnings ──────────────────────────────────────────────────────────

function renderInfo({ attempts, elapsed, scoreRange, usedFallback }) {
  const mode =
    currentMode === "standard" ? "Standard (3-4p)" : "Extended (5-6p)";
  const timeStr =
    elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;
  const status = usedFallback
    ? `<span style="color:#f08040">Best effort</span>`
    : `<span style="color:#80c840">Valid ✓ (best of ${attempts})</span>`;
  const scoreStr = scoreRange ? `${scoreRange[0]} → ${scoreRange[1]}` : "—";

  document.getElementById("info-bar").innerHTML = `
    <div class="info-pill">Mode: <span>${mode}</span></div>
    <div class="info-pill">Time: <span>${timeStr}</span></div>
    <div class="info-pill">Score range: <span>${scoreStr}</span></div>
    <div class="info-pill">Status: ${status}</div>
  `;
}

function renderWarnings({ usedFallback }) {
  const c = document.getElementById("warning-container");
  if (usedFallback) {
    c.innerHTML = `<div class="warning-box">⚠️ Nije pronađeno potpuno validno rješenje u zadanom vremenu. Prikazuje se best-effort raspored — pokušaj isključiti neka pravila.</div>`;
  } else {
    c.innerHTML = "";
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  generateMap();
});
