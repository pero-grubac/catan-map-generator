// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCE_COLORS = {
  forest: { fill: "#3d6b1a", stroke: "#2a4d0f", label: "Forest" },
  fields: { fill: "#c8a840", stroke: "#a08020", label: "Grain" },
  pasture: { fill: "#7ab828", stroke: "#558a10", label: "Sheep" },
  mountains: { fill: "#7a5030", stroke: "#5a3820", label: "Rock" },
  hills: { fill: "#c86030", stroke: "#a04020", label: "Clay" },
  desert: { fill: "#d8c878", stroke: "#b8a858", label: "Desert" },
};

// Per-resource fractal-noise parameters used to give each tile a painted,
// textured surface instead of a flat fill (see buildNoiseFilter/TEXTURE_CONFIG).
const TEXTURE_CONFIG = {
  forest: { baseFreqX: 0.028, octaves: 2, seed: 4, gamma: 1.4 },
  fields: { baseFreqX: 0.012, baseFreqY: 0.16, octaves: 2, seed: 9, gamma: 1.6 },
  pasture: { baseFreqX: 0.07, octaves: 3, seed: 12, gamma: 2.0 },
  mountains: { baseFreqX: 0.05, octaves: 5, seed: 21, gamma: 1.2 },
  hills: { baseFreqX: 0.035, octaves: 3, seed: 33, gamma: 1.5 },
  desert: { baseFreqX: 0.12, octaves: 2, seed: 44, gamma: 2.2 },
  sea: { baseFreqX: 0.09, baseFreqY: 0.04, octaves: 2, seed: 61, gamma: 2.4 },
};

// Icon fill colour tuned per resource for contrast against its tile colour.
const ICON_COLORS = {
  forest: "rgba(235,240,215,0.92)",
  fields: "rgba(55,38,8,0.8)",
  pasture: "rgba(255,255,255,0.92)",
  mountains: "rgba(255,255,255,0.92)",
  hills: "rgba(255,255,255,0.92)",
  desert: "rgba(80,54,16,0.82)",
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
  { r: 0, c: 1, edge: 5, label: "3:1", res: null },
  { r: 0, c: 2, edge: 0, label: "3:1", res: null },
  { r: 1, c: 3, edge: 1, label: "2:1", res: "hills" },
  { r: 2, c: 4, edge: 2, label: "2:1", res: "forest" },
  { r: 4, c: 2, edge: 2, label: "3:1", res: null },
  { r: 4, c: 1, edge: 3, label: "2:1", res: "fields" },
  { r: 3, c: 0, edge: 3, label: "2:1", res: "mountains" },
  { r: 2, c: 0, edge: 4, label: "3:1", res: null },
  { r: 1, c: 0, edge: 5, label: "2:1", res: "pasture" },
];

const EXT_PORT_POSITIONS = [
  { r: 0, c: 0, edge: 5, label: "3:1", res: null },
  { r: 0, c: 1, edge: 0, label: "2:1", res: "pasture" },
  { r: 1, c: 3, edge: 0, label: "3:1", res: null },
  { r: 3, c: 5, edge: 1, label: "3:1", res: null },
  { r: 4, c: 4, edge: 2, label: "2:1", res: "hills" },
  { r: 5, c: 3, edge: 2, label: "2:1", res: "pasture" },
  { r: 6, c: 2, edge: 3, label: "2:1", res: "forest" },
  { r: 6, c: 0, edge: 3, label: "3:1", res: null },
  { r: 3, c: 0, edge: 5, label: "2:1", res: "mountains" },
  { r: 4, c: 0, edge: 4, label: "3:1", res: null },
  { r: 5, c: 0, edge: 4, label: "2:1", res: "fields" },
];

// Cities & Knights (3-4p): same 19-hex board as Standard, but the printed
// frame has a different harbour layout.
const CK_PORT_POSITIONS = [
  { r: 0, c: 1, edge: 5, label: "2:1", res: "mountains" },
  { r: 0, c: 2, edge: 1, label: "2:1", res: "forest" },
  // inset: shifts the harbour icon toward the shore (in hex radii) to leave
  // room for the barbarian track on its seaward side
  { r: 3, c: 3, edge: 1, label: "3:1", res: null, inset: 0.22 },
  { r: 4, c: 2, edge: 2, label: "3:1", res: null },
  { r: 4, c: 1, edge: 3, label: "2:1", res: "fields" },
  { r: 4, c: 0, edge: 3, label: "3:1", res: null },
  { r: 3, c: 0, edge: 4, label: "2:1", res: "pasture" },
  { r: 2, c: 0, edge: 4, label: "3:1", res: null },
  { r: 1, c: 0, edge: 5, label: "2:1", res: "hills" },
];

// Barbarian track (Cities & Knights): a pirate ship at both ends (it starts at
// the far end and sails toward the coast) and 6 waves between, drawn as marks
// inside the existing sea hexes along the east coast (on the offshore side of
// the harbour there), so no extra hexes are needed. Offsets are in hex-widths
// (DX) from the centre of the sea hex east of BARBARIAN_START.
// Positions are chosen so each mark (at its drawn size) lies fully inside one
// sea hex and clear of the harbour icon in the hex east of (3,3).
const BARBARIAN_START = { r: 2, c: 4 };
const BARBARIAN_MARKS = [
  { x: 0.235, y: -0.207 },
  { x: 0.343, y: 0.018 },
  { x: 0.063, y: 0.316 },
  { x: -0.153, y: 0.722 },
  { x: -0.289, y: 1.083 },
  { x: -0.731, y: 1.534 },
  { x: -0.758, y: 1.768 },
  { x: -0.938, y: 2.039 },
];
// Pirate-flag crimson with a cream rim: stands out on the blue sea and is
// distinct from the white harbour icons and the number tokens on land.
const BARBARIAN_COLORS = { fill: "#b8322a", rim: "#f3e3c3" };

const PORT_POSITIONS = {
  standard: STD_PORT_POSITIONS,
  knights: CK_PORT_POSITIONS,
  extended: EXT_PORT_POSITIONS,
};

const MODE_LABELS = {
  standard: "Standard (3-4p)",
  knights: "Cities & Knights (3-4p)",
  extended: "Extended (5-6p)",
};

// Outward angle (degrees) for each edge direction
const EDGE_ANGLE = [30, 90, 150, 210, 270, 330]; // NE,E,SE,SW,W,NW

// ─── Grid ─────────────────────────────────────────────────────────────────────

function getRowCounts(mode) {
  return mode === "extended" ? [3, 4, 5, 6, 5, 4, 3] : [3, 4, 5, 4, 3];
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
  document
    .querySelectorAll(".legend-knights")
    .forEach((e) => (e.style.display = mode === "knights" ? "" : "none"));
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
    currentMode === "extended" ? { ...EXT_RESOURCES } : { ...STD_RESOURCES };
  const numbers = currentMode === "extended" ? EXT_NUMBERS : STD_NUMBERS;

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

// Builds an SVG filter that turns a solid white shape into a mottled,
// variable-opacity fractal-noise mask (fed by feTurbulence). Applying it to a
// white overlay with a blend mode (soft-light/overlay) gives any flat fill a
// hand-painted, textured surface without needing raster art.
function buildNoiseFilter(id, { baseFreqX, baseFreqY = baseFreqX, octaves, seed, gamma }) {
  const filter = svgEl("filter", {
    id,
    x: "-20%",
    y: "-20%",
    width: "140%",
    height: "140%",
  });
  filter.appendChild(
    svgEl("feTurbulence", {
      type: "fractalNoise",
      baseFrequency: `${baseFreqX} ${baseFreqY}`,
      numOctaves: String(octaves),
      seed: String(seed),
      result: "turb",
    }),
  );
  filter.appendChild(
    svgEl("feColorMatrix", {
      in: "turb",
      type: "matrix",
      values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0",
      result: "turbA",
    }),
  );
  const ct = svgEl("feComponentTransfer", { in: "turbA", result: "turbAdj" });
  ct.appendChild(
    svgEl("feFuncA", {
      type: "gamma",
      amplitude: "1",
      exponent: String(gamma),
      offset: "0",
    }),
  );
  filter.appendChild(ct);
  filter.appendChild(
    svgEl("feComposite", { in: "SourceGraphic", in2: "turbAdj", operator: "in" }),
  );
  return filter;
}

function buildDefs() {
  const defs = svgEl("defs", {});
  for (const [name, cfg] of Object.entries(TEXTURE_CONFIG)) {
    defs.appendChild(buildNoiseFilter(`tex-${name}`, cfg));
  }
  const shadow = svgEl("filter", {
    id: "icon-shadow",
    x: "-40%",
    y: "-40%",
    width: "180%",
    height: "180%",
  });
  shadow.appendChild(
    svgEl("feDropShadow", {
      dx: "0",
      dy: "1",
      stdDeviation: "1",
      "flood-color": "#000",
      "flood-opacity": "0.35",
    }),
  );
  defs.appendChild(shadow);
  return defs;
}

// Real resource icons (single-path silhouettes) — pine-tree, wheat, sheep,
// mountains, clay-brick, desert, sailboat, galleon & wave crest by lorc / delapouite, sourced from
// game-icons.net (CC BY 3.0, https://creativecommons.org/licenses/by/3.0/).
// Each is a 512×512 viewBox path; drawResourceIcon scales+positions it inline.
const RESOURCE_ICON_PATHS = {
  forest:
    "M249.28 19.188v.25c-18.114 38.634-45.065 72.36-77.686 102.937l37.72-3.938-51.345 65.032 24.81-7.907-33.624 54.875 16.53 9.843-65.25 92.157 36.095.188-51.686 83.594 63.562-8.126 12 32.094 66.438-25.282L215.5 493.28h52.938l-6.532-68.217 38.188 16.406 10.187-24.783 44.283 20.97 56.406-20.75-37.064-64.094-12.437-2.282 6.78 17.19 7.844 19.905-19.938-7.78-50.906-19.908V395.688l-14.156-8.594-69.375-42-21.595 21.25-18.03 17.75 2.155-25.22 2.125-24.655 18.188 1.56 9.218-9.092 5.19-5.094 6.218 3.75 61.375 37.156v-29.906l12.75 4.97 43.718 17.092-5.092-12.906-6.157-15.656 16.533 3.03 45.468 8.345-34.53-38.94-23.625 14.033-6.688 3.968-5.125-5.874-14.28-16.437.218 1.217-18.406 3.22-5.97-34.313-5.75-33.063 22 25.345 31.188 35.875 43.907-26.03c-24.67-19.543-39.507-33.87-49.658-48.814l.813 12.656 1.97 31-18.75-24.75-34.47-45.437-22.25 46.813-13.844 29.125-3.843-32.032-3.5-28.843 16.532-1.968 16.624-34.97 6.594-13.875 9.28 12.22 25 32.936-.75-11.53-.906-14.28 13.47 4.936L341.81 188l-26.125-35.156-55.843-28.875-8.938 20.218-9.656 21.937-7.72-22.688-7.468-21.875 16.97-5.78 3.718-8.438 4-9.125 8.844 4.593 49.375 25.53 16.467-5.562c-43.42-34.31-64.63-68.886-76.156-103.593z",
  fields:
    "M98.344 16.688C79.692 43.785 68.498 69.01 65.5 89.56l23.938 39.157 28.624-33.47c.868-21.213-5.49-48.677-19.718-78.563zM472.5 19.625C444.04 36.055 423.112 54 411.562 71.25l4.75 45.688L456.563 99c9.89-18.777 15.938-46.29 15.938-79.375zm-91.75 27.28c-10.153 21.036-16.8 40.84-20.156 58.314l18.375 57.686 19.78-34.25-6.5-62.22h.03c-3.422-6.392-7.252-12.906-11.53-19.53zM27.25 80.782c-.125 23.364 2.393 44.102 6.875 61.314L75.5 186.25l3.125-39.406L46 93.47l.03-.032c-5.83-4.287-12.08-8.52-18.78-12.657zm132.844 10.532c-8.415 3.504-16.29 7.213-23.594 11.094l-39.25 45.97-3.094 39.374 50.438-39.094c6.712-15.904 12.09-35.263 15.5-57.344zm177.22 21.626c-24.024 58.09-16.16 97.86 7.873 108.5l21.157-36.625-19.594-61.438c-2.973-3.46-6.108-6.943-9.438-10.438zm146.03.218c-4.55-.028-8.97.084-13.28.28L414.935 138l-19.78 34.28 62.343-13.655c12.897-11.47 26.09-26.626 38.656-45.094-4.358-.216-8.64-.348-12.812-.374zm-226.094 8.72c-23.24 23.238-38.832 46.003-45.53 65.655l16.436 42.907 34.22-27.75c4.695-20.704 3.436-48.856-5.126-80.812zM16.406 159.06c3.28 62.77 27.482 95.31 53.75 94.594l3.344-42.22-44.063-47c-4.175-1.844-8.515-3.647-13.03-5.374zm143.22 11.375c-6.457 1.354-12.63 2.896-18.5 4.563l-48.97 37.938-3.312 41.75c26.492 7.51 57.16-20.567 70.78-84.25zm16.06 1.563c-4.36 22.935-5.65 43.762-4.374 61.5l32.688 51 10.22-38.188-22.407-58.437h.03c-4.952-5.28-10.318-10.592-16.155-15.875zm267.408 8.938l-60.563 13.218-20.936 36.25c20.682 18.195 60.438 6.035 100.125-45.625-6.413-1.552-12.62-2.823-18.626-3.843zm-138.688 25.53c-8.912 1.92-17.304 4.16-25.187 6.657l-46.97 38.03-10.22 38.19 56.69-29.283c9.493-14.424 18.323-32.49 25.686-53.593zm155.125 25.063c-25.85 20.324-44.046 41.06-53.03 59.782l11.22 44.532 37.28-23.47c7.126-19.99 9.236-48.088 4.53-80.843zm-123.342 8.595c-34.435 77.573-59.394 159.06-62.97 253.03h18.72c3.558-90.792 27.573-169.428 61.312-245.436l-17.063-7.595zm-185.375 6.906c-8.173 62.347 9.714 98.713 35.687 102.75l10.97-40.874-34.814-54.25c-3.77-2.57-7.713-5.105-11.844-7.625zm221.75 24.532c-7.053 22.243-10.817 42.77-11.657 60.532l26.406 54.594L402 349.967l-15.28-60.687h.06c-4.3-5.848-9.033-11.76-14.217-17.717zm-302.47 1.532c-8.664 74.584-8.13 147.835 12.188 220.062h19.44c-20.877-70.772-21.764-143.02-13.064-217.906l-18.562-2.156zm219.47 11.094c-6.613.16-12.953.54-19.032 1.125L215.5 313.78l-10.844 40.408c24.69 12.23 59.938-9.82 84.906-70zm206.718 36.937c-9.072.844-17.664 2.052-25.78 3.594l-51.156 32.217-14.688 36.657 59.75-22.313c11.14-13.193 22.055-30.075 31.875-50.155zm-157.31 22c-15.528 60.938-2.096 99.19 23.217 106.28l15.72-39.28-28.094-58.03c-3.43-3-7.053-5.985-10.844-8.97zM183.25 368.72c-12.674 41.233-22.26 82.547-26.844 124.436h18.813c4.507-39.722 13.69-79.23 25.905-118.97l-17.875-5.467zm270 26.655l-58 21.688-15.563 38.875c23.056 15.098 60.673-2.606 92.625-59.407-6.594-.627-12.95-1.003-19.062-1.155zM356.5 469.03c-1.874 7.713-3.185 15.757-3.656 24.126h18.687c.45-6.686 1.55-13.206 3.126-19.687l-18.156-4.44z",
  pasture:
    "M392.8 107.5c9.3 5.3 25.8 9.3 40 9.2 7.7-.1 14.6-1.2 19.5-3.2 5-1.8 6.9-4.9 8.9-8.8-9.2-6.08-22.1-12.27-31.8-12.87-14.9.53-28.8 8.13-36.6 15.67zm-253 20.2c-1.7 5.5-7.9 8.1-13 5.4-26.5-14.5-50.46-6.9-67.71 8.7-35.93 32.6-45.13 87.3-32.47 145.7 7.31 33.6 18.99 53 41.29 62.8 0 .1.1.1.15.1 2.22 1 4.21 1.9 6.09 2.8l4.61-22c1.02-4.9 5.8-8 10.66-7s7.98 5.8 6.96 10.7l-23.5 112c4.79 7.2 16.4 1.2 21.3-1.2l38.12-106.5c10.8-9.4 21.2-19 28.7-29.2 6.6-9.1 10.4-18.4 10.6-23.5.2-5 4.4-8.9 9.4-8.7 5 .2 9 4.6 8.6 9.6-.6 11.2-6.2 22.4-14 33.2-7.3 10-16.7 19.6-27.2 27.2l-3.3 8.9c6.9 8.7 13.4 13.8 19.6 16.8 8.8 4.1 17.7 4.6 28.5 3.3 16.4-1.9 34.6-12.9 43.5-37.2 2.8-7.7 13.6-8 16.8-.5 7.7 21.2 36.1 32.6 55.1 24l-3.9-23.3c-.8-4.9 2.5-9.6 7.4-10.4 4.9-.9 9.6 2.5 10.4 7.4l17.6 105.9c9.2 6.3 14.5 2.4 19.9-4.4l-13.8-114.4c-.7-5.3 3.3-10 8.6-10.2 4.8-.2 8.8 3.3 9.3 8l4.3 35.7c5.1-1.2 9.1-2.5 12.4-5 4.3-3.2 8.5-8.7 12.1-21.5 1.7-6 9-8.5 14.1-4.7 13.6 8.3 27.4-1.8 35.6-12.2 12.9-16.5 14.7-42.4 13.2-69.2-2.1.3-4.2.5-6.3.6-8.8.5-17.9-.9-25.7-4.4-12.4-7-22-18.4-28.2-28.9-3.9-6.8-7.3-13.7-10.5-20-5.4 9.9-11 23.1-19.2 25-12.5 2.1-23.9-3.7-29.8-12.7-5.9-8.9-7.4-20.2-4.8-31.1 2.7-11.7 9.8-38.3 22.6-56.1 2.2-2.9 4.5-5.3 6.8-7.4-7.5-3.1-16.2-3.8-22.9-3.8-5.8 0-13.5 1.8-19.7 5-6.2 3.3-10.7 7.8-12.2 11.8-3.2 8.5-15.5 7.5-17.3-1.3-3.8-22.78-53.9-17.8-65.6 2-3.8 7-14.1 5.9-16.5-1.7-8.1-22.61-62.7-21.3-66.7 5.9zm345-1.5c1.7 16.4 3.5 32.2 4.2 45.6 1.8 6.5 6 18.9 8.7 7.3.9-4.1.8-11-.4-18.6-.1-7.1-14.5-47.3-12.5-34.3zm-112.7-2.5c-11.9 15-19.2 37.4-23.3 53.7-.6 5.8-.6 12.6 2.3 17.1 2.3 3.4 4.8 5.2 9.4 5 5.8-9.4 12.1-19.8 15.6-28.2-1.2-7.9-2.8-19.9-3.6-31.4-.4-5.8-.6-11.2-.4-16.2zm94.4 2.4c-2.4 1.6-4.8 3.1-7.5 4.1-7.8 3.2-16.8 4.4-26 4.5-14.8.1-30.2-2.7-42.9-8.4 0 3.6.1 7.7.4 12.3.9 12.6 3 27.2 4 33.5 10.5 16.6 19.9 44.4 36.8 52.5 5.8 2 11.9 3.1 17.2 2.9 6-.4 10.6-2.6 11.5-3.7 3.5-8 5.9-15.2 7.3-22.3 2.1-10.9 3.4-23.3 3.6-31.6.3-6.4-.6-13.3-1.1-18.7-1.4 4.1-5.7 6.6-10 5.9-4.3-.7-7.5-4.4-7.5-8.8 0-5.1 4.2-9.2 9.3-9 3 0 5.8 1.7 7.4 4.3-.9-6.1-1.4-12-2.5-17.5zm-58.3 16.5c4.9.2 8.7 4.2 8.7 9 0 5-4 9-9 9-4.9 0-9-4-9-9s4.2-9.1 9.3-9zm47.5 48.3c3.7-.1 6.5 1.9 6.5 6.2 0 7.8-5.8 15-12.7 19l-1-23.1c2.5-1.4 5-2.1 7.2-2.1zm-24.1 2c1.8-.1 3.9.4 5.8 1.3l3.8 22.5c-6-3.7-15.4-3.6-16.5-16.1-.5-5.2 2.8-7.7 6.9-7.7zm-30.9 164.2c-3.7 5.1-7.6 9.1-12.6 12.1l16.6 62c7.6 1.5 15.9 1 19.2-5.1zm-241.2 33.7l1.5 46.8c7.9 7.9 12.9 4.8 19.7-3l-3.7-39.5c-6.3-.9-12.6-2.2-17.5-4.3z",
  mountains:
    "M256.22 18.375c-132.32 0-239.783 107.43-239.783 239.75S123.9 497.905 256.22 497.905 496 390.446 496 258.126 388.54 18.375 256.22 18.375zm0 17.875c102.773 0 189.092 69.664 214.374 164.406l-79.313-81.47-6.967-7.155-6.688 7.47-77.22 86.438c-11.493-10.268-22.98-20.284-34.467-30.063l-6.563-5.625-6.125 6.156c-18.41 18.527-36.937 37.61-55.438 57.094l-76.437-83.375-6.875-7.5-6.875 7.5-71.188 77.313C51.364 119.34 143.983 36.25 256.22 36.25zm102.25 147.28l-3.845 35.376 21.563-32 10.75 16.688 9.968-8.47 27.188 26.814L417 187.344l19.5 5.062 39.188 40.25.843-.812c1.016 8.618 1.564 17.388 1.564 26.28 0 37.033-9.06 71.917-25.063 102.595-46.25-53.48-92.512-100.116-138.75-142.283l11-12.312 33.19-22.594zM138.31 206.28l26.438 18.782 20.22 22.032c-39.47 42.024-78.63 85.836-115.94 130.344-21.98-34.443-34.718-75.38-34.718-119.313v-.78l16.25-17.658 37.25-20.187-17.187 54.063 41.813-51.22 27.312 32.72-1.438-48.782zm141.375 61.657l53.157 60.938-7.688-54.563L386.312 315c18.918 19.863 37.83 40.733 56.75 62.78l.188-.186C403.853 439.216 334.868 480.03 256.22 480.03c-71.76 0-135.483-33.992-176.033-86.75 19.135-22.91 38.775-45.645 58.72-68.06l56.155-33.814-29.312 76.75 61.53-73.375 6.25 32.19 19.532-36.783 47.844 69.5-21.22-91.75z",
  hills:
    "M329.3 99.64l-39.7 10.46c-30.2 26.1-62.7 50.9-96.7 75.1l-6.7 21-34.1 7.3c-22.6 15.3-45.6 30.4-68.82 45.5l120.32 18.4 213.9-167.1c-27.7-3.8-56.9-7.5-88.2-10.66zm103.4 21.56l-61.4 47.9-43 53.1-45 15.7-65 50.7 20.8 115.1c65.6-54.6 127.6-109.4 187-163.1l-5.6-31.2 42.1-1.9c8.3-7.4 16.5-14.9 24.6-22.3zM61.58 277.6c-21.15 39.9-32.01 70.6-36.83 95.8 9.21 1.1 18.3 2.2 27.28 3.5l16.76-30.6 5.52 34c53.29 8.6 103.09 20.5 152.19 32.1l-26.9-117.6-66-10.1z",
  desert:
    "M481.5 21.96l-45.6 12.33c2.6 5.3 4.3 11.14 4.9 17.3l45.3-12.25-4.6-17.38zm-279.3.67L200 40.51l143 17.04V56c0-5.7 1-11.17 2.8-16.26L202.2 22.63zM392 25c-17.2 0-31 13.77-31 31s13.8 31 31 31 31-13.77 31-31-13.8-31-31-31zm-43.8 52.81l-74.5 54.89 10.6 14.4L359 92.12c-4.5-4.05-8.1-8.9-10.8-14.31zm73.9 16.81c-4.8 3.7-10.2 6.58-16.1 8.28l38.9 67.2 15.6-9-38.4-66.48zm-294.2.58c-.3.01-.5.02-.7.04-3.3.32-7.7 3.47-11.8 8.76-2.5 20.1-2.5 42.6.3 62.6l1.7 11.8-11.9-1.7c-5.1-.7-7.11-.8-12.91-.4l-8.75.6-.8-8.8c-.8-8.6-3.77-20.7-7.11-29.3-3.41-2.9-5.73-3.4-7.78-3.2-1.85.3-4.44 1.5-7.51 4.5 1.81 18.8 3.36 36.9 8.7 54.9 9.63 4.2 23.42 6.4 36.96 5.7l10-.5-.6 10c-4.3 73.9-6.1 142.6-1 215.8 8.1 3.7 15.8 5.5 21.9 5.5 5.8 0 9.6-1.5 12-3.5 4.5-42.7.6-83.1-1.8-124.8l-.5-9.4 9.4-.1c10.7-.1 19.7-2.3 25.9-5.4 6-2.8 8.8-6.4 9.3-7.8 5.6-38.6 9.4-72.6 7.2-109.3-.1-2.2-.7-2.9-1.8-3.8-1-.9-3-1.7-5.2-1.8-2.2-.2-4.6.3-6.1 1.1s-2 1.5-2.3 2.4c-9.4 31.1-17.3 62-18.6 94.7v.1l-18-.9v-.1c2.7-51 .6-104.7-2.6-156.2-7.2-9.39-12.2-11.54-15.6-11.5zm239.6 3.2l-53.9 142.9 16.8 6.4 54-143.3c-6-.9-11.8-3-16.9-6zm66.4 111.7v47.8l-7.6-1.8-4-28.2-17.8 2.6 5.8 40.4 23.6 5.5V297h-233c-3.1 3-7.1 5.5-11.4 7.6-6.8 3.2-15 5.6-24.2 6.6 2.5 39.2 5.8 78.9.9 121.7l-.2 2.4-1.5 2c-6.4 8.5-17 12.2-27.9 12.2-11 0-22.9-3.3-34.8-9.7l-4.41-2.3-.36-4.9C93.6 386.2 93 341.8 94.04 297H25v190h462V297h-35.1v-38.5l23-5.3 4.8-24.8-17.6-3.4-2.6 13.2-7.6 1.7v-29.8h-18z",
  port:
    "M199.256 74.5v285H27.744l25.998 78H380.255l104-78h-267v-285h-18zm18 18c36.787 88.85 64.94 216 0 250h208c22-34-11.905-164.76-208-250zm-36 0c-33.046 69.333-50 200-144 250h144v-250z",
  pirate:
    "M222.03 20.53v58.25L165.938 99l6.344 17.563 49.75-17.938v96.156l-87.155 33.845 6.75 17.406 80.406-31.218v141.97h-61.655l-1.438-7.594-4.687-25.063H95.812v-142.47l60.157-21.686-6.345-17.595-53.813 19.406V78.345H77.126v90.187l-52 18.75 6.344 17.564 45.655-16.47v135.75H26.437c5.565 54.4 27.327 108.08 66.782 143.595H375.56c9.543-51.545 39.83-95.146 73.688-136.44h-.063L494.594 299l-10.813-15.25-66.874 47.53H367.25V219.314l62.188-22.438-6.313-17.563-55.875 20.157v-67.032h-18.688v73.78l-49.937 18 6.313 17.563 43.625-15.75v121.595l-4.907 5.844-2.812 3.31H240.72V207.564l87.155-33.844-6.78-17.407-80.376 31.218V91.907l56.06-20.22-6.342-17.592-49.72 17.937v-51.5H222.03z",
  wavecrest:
    "M298.844 21.47c-19.177.074-37.7 9.793-43.156 29.06-21.613-18.783-57.038-5.957-57.97 13.907-.397.11-.79.234-1.187.344-12.147-4.116-20.077-.304-24.186 7.44-18.52-14.45-44.42-1.614-51.188 19.218-14.786-17.19-42.58 4.042-30.406 25.124.188.327.397.63.594.938a341.266 341.266 0 0 0-14.063 11.28 51.335 51.335 0 0 0-23.56-5.155c-13.145.303-26.367 5.78-36.19 17.625v118.063c6.726 4.154 16.51 6.48 24.94 5.375a372.038 372.038 0 0 0-16.75 58.437c-.277.918-.546 1.85-.782 2.813-.782 3.182-1.24 6.21-1.407 9.093-9.176 55.403-5.31 111.628 13.095 161.126H56.72c-15.91-39.335-21.726-84.3-18.095-129.875 20.554 13.602 55.617 7.05 63.563-25.31 7.245-29.515-15.273-47.982-38.126-47.876-4.062.02-8.143.638-12.062 1.875 5.06-17.025 11.418-33.773 19.063-49.94a341.501 341.501 0 0 1 19.75-36.03c13.37 8.93 38.33 6.824 41.25-21 1.343 4.814 9.112 7.514 15.656 7.438-10.532 23.45-18.023 48.2-22.564 73.343-8.506 47.1-6.837 95.784 4.625 140.564-22.214 3.28-24.636 38.295 1.22 38.844 4.18.087 7.748-.735 10.72-2.188 7.164 17.84 16.073 34.685 26.686 50.156h23.156c-45.083-57.982-62.535-143.55-48-224.03.185-1.024.4-2.042.594-3.063 12.583 16.662 30.995 16.28 44.313 7.156.098 7.433.444 14.858 1.06 22.25 6.366 76.193 39.422 149.527 91.626 197.686h29.156c-57.272-43.11-95.5-119.53-102.156-199.22-5.615-67.22 10.893-136.265 56.125-190.155-22.662 48.81-28.814 101.335-22.405 152.032-10.69 7.01-16.59 20.936-7.063 35.813 4.65 7.262 10.705 10.994 16.938 12.125a330.085 330.085 0 0 0 6.72 20.78c25.606 71.122 74.834 133.122 135.936 168.626h43.28c-69.03-26.022-128.378-90.037-158.405-166.47 12.857.64 25.67-14.788 16.658-29.686-3.872-6.39-9.452-9.026-14.97-9 3.396-7.17 3.52-15.913-2-24.53-4.954-7.738-11.826-11.5-18.874-12.25-5.378-44.973-.098-91.102 18.812-134.345l.906 1.75C273.37 181.75 290.925 240.357 322.625 289c10 15.346 21.402 29.735 33.906 42.938a19.978 19.978 0 0 0-3.592-.313c-19.654.194-25.004 31.01-1.75 36.72 15.508 3.807 23.524-8.896 21.687-20.408 34.925 31.702 76.562 54.554 119.906 64.094v-19.217c-59.818-14.523-117.576-57.376-154.5-114.032-24.12-37.01-39.39-79.608-41.092-124 4.408-66.014 98.113-44.375 115.656-5.155-6.523-34.758-23.54-58.183-46.094-73.188 15.407-13.958-4.283-37.503-20.813-26.156-8.08-19.323-27.917-28.886-47.093-28.81zm-138.625 2c-2.13.103-4.395.752-6.72 2.03-16.766 9.213-4.997 35.847 12.75 26.094 15.18-8.345 7.774-27.85-5.125-28.125-.3-.008-.602-.016-.906 0zm264.155 22.874c-19.126-.404-22.245 28.57-2 29 20.526.43 21.4-28.59 2-29zM53.5 75.687C43.338 76.05 33.672 88.067 40.562 100c10.167 17.61 36.35 2.13 25.594-16.5-3.315-5.743-8.037-7.977-12.656-7.813zm69.906 42.282c.402.812.812 1.623 1.28 2.436 2.326 4.027 5.03 7.26 7.97 9.813a320.203 320.203 0 0 0-29.875 30.936 44.622 44.622 0 0 0-10.25-20.78c6.11-5.04 12.437-9.807 18.907-14.376 4.71-1.154 9.05-4.033 11.97-8.03zM181 123.062a46.38 46.38 0 0 0 7.063 7.374 272.932 272.932 0 0 0-11.97 15.5 37.77 37.77 0 0 0-10.593-10.812 36.763 36.763 0 0 0 15.5-12.063zm240 51.593c-25.802.693-29.64 40.193-1.594 40.78 28.89.61 30.117-40.2 2.813-40.78-.422-.01-.81-.01-1.22 0zm-244.188 4.625c3.198 9.806 12.542 14.786 22.125 13.69a285.615 285.615 0 0 0-5.718 25.124c-6.353-6.258-13.926-9.102-21.5-9.25-3.403-.067-6.787.43-10.064 1.375a276.48 276.48 0 0 1 15.156-30.94zm280.47 42.22c-18.49-.39-21.542 27.59-1.97 28 19.844.417 20.725-27.608 1.97-28z",
};

// Draws a real icon (see RESOURCE_ICON_PATHS) centred at (cx, cy) with the
// given pixel width `w` (the source is a 512×512 square, scaled to fit).
function drawResourceIcon(resource, cx, cy, w, color, outline) {
  const d = RESOURCE_ICON_PATHS[resource] || RESOURCE_ICON_PATHS.port;
  const scale = w / 512;
  const attrs = {
    d,
    fill: color,
    filter: "url(#icon-shadow)",
    transform: `translate(${cx - w / 2}, ${cy - w / 2}) scale(${scale})`,
  };
  if (outline) {
    // thin light rim so a dark icon stays readable on the dark sea
    attrs.stroke = outline;
    attrs["stroke-width"] = 14; // path units, scaled with the icon
    attrs["stroke-linejoin"] = "round";
    attrs["paint-order"] = "stroke";
  }
  return svgEl("path", attrs);
}

function renderMap({ hexes, rowCounts, nc, resourceArr, numberArr }) {
  const svg = document.getElementById("map-svg");
  const S = currentMode === "extended" ? 54 : 64;
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
  const portPositions = PORT_POSITIONS[currentMode];

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

  // Barbarian track origin: the sea hex east of BARBARIAN_START
  let barbarianOrigin = null;
  if (currentMode === "knights") {
    const startIdx = hexes.findIndex(
      (h) => h.r === BARBARIAN_START.r && h.c === BARBARIAN_START.c,
    );
    barbarianOrigin = {
      x: landPixels[startIdx].x + NEIGH_OFFSETS[0].x,
      y: landPixels[startIdx].y + NEIGH_OFFSETS[0].y,
    };
  }

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
  svg.appendChild(buildDefs());

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
    svg.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx, cy, S - 1),
        fill: "#dff0fb",
        filter: "url(#tex-sea)",
        style: "mix-blend-mode:soft-light;pointer-events:none",
        opacity: "0.6",
      }),
    );

    if (sh.isPort && sh.portType) {
      const pt = sh.portType;
      // optionally nudge the icon + label toward the shore (see pt.inset)
      let px = cx;
      if (pt.inset) {
        const toSea = NEIGH_OFFSETS[EDGE_TO_NEIGH[pt.edge]];
        const len = Math.hypot(toSea.x, toSea.y);
        px = cx - (toSea.x / len) * pt.inset * S;
      }
      svg.appendChild(
        drawResourceIcon(pt.res, px, cy - S * 0.14, S * 0.62, "#eef6fb"),
      );
      svg.appendChild(
        svgEl(
          "text",
          {
            x: px,
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

  // Barbarian track marks (drawn over the sea hexes they sit in)
  if (barbarianOrigin) {
    const last = BARBARIAN_MARKS.length - 1;
    const { fill, rim } = BARBARIAN_COLORS; // ships only; the wave crests are white
    BARBARIAN_MARKS.forEach((o, i) => {
      const x = barbarianOrigin.x + o.x * DX + offX;
      const y = barbarianOrigin.y + o.y * DX + offY;
      if (i === 0 || i === last) {
        // pirate galleon at both ends: where the ship starts and where it attacks
        svg.appendChild(drawResourceIcon("pirate", x, y, S * 0.42, fill, rim));
      } else {
        // a wave crest the ship sails through, white like the harbour icons
        svg.appendChild(
          drawResourceIcon("wavecrest", x, y, S * 0.42, "#eef6fb"),
        );
      }
    });
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

    // Painted-terrain texture overlay
    g.appendChild(
      svgEl("polygon", {
        points: hexCorners(cx, cy, S - 1),
        fill: "#ffffff",
        filter: `url(#tex-${resource})`,
        style: "mix-blend-mode:soft-light;pointer-events:none",
        opacity: "0.65",
      }),
    );

    // Resource icon
    g.appendChild(
      drawResourceIcon(
        resource,
        cx,
        resource !== "desert" ? cy - S * 0.1 : cy,
        S * 0.8,
        ICON_COLORS[resource],
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
  const mode = MODE_LABELS[currentMode];
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
