import {
  RESOURCE_COLORS,
  TEXTURE_CONFIG,
  ICON_COLORS,
  NUM_DOTS,
  HOT,
  RARE,
  BARBARIAN_START,
  BARBARIAN_MARKS,
  BARBARIAN_COLORS,
  PORT_POSITIONS,
  MODE_LABELS,
} from "./constants.js";
import { RESOURCE_ICON_PATHS } from "./icons.js";

// ─── SVG rendering ────────────────────────────────────────────────────────────

function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
  }).join(" ");
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

export function renderMap({
  mode,
  hexes,
  rowCounts,
  resourceArr,
  numberArr,
  vertices,
  pips,
  showStrength,
}) {
  const svg = document.getElementById("map-svg");
  const S = mode === "extended" ? 54 : 64;
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
  const portPositions = PORT_POSITIONS[mode];

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
  if (mode === "knights") {
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

  // ── 3. Intersection strength overlay (optional) ──
  if (showStrength && vertices && pips) {
    svg.appendChild(drawStrengthOverlay(vertices, pips, S, offX, offY));
  }
}

// ─── Intersection strength ────────────────────────────────────────────────────
// One disc per land-hex corner, growing and warming with its total pips.
// Discs stay under 0.2 hex radii, so they end well before the number token
// (centred 0.52 radii below the hex centre) and never cover it.

export const STRENGTH_TIERS = [
  { min: 13, fill: "#d93a2a", text: "#fff", label: "13+" },
  { min: 10, fill: "#f08a3a", text: "#1a0e04", label: "10–12" },
  { min: 5, fill: "#e8b84b", text: "#1a0e04", label: "5–9" },
  { min: 1, fill: "#cfc4a8", text: "#1a0e04", label: "1–4" },
];

export function strengthTier(total) {
  return STRENGTH_TIERS.find((t) => total >= t.min) || null;
}

function drawStrengthOverlay(vertices, pips, S, offX, offY) {
  const g = svgEl("g", { class: "strength-overlay", "pointer-events": "none" });
  vertices.forEach((v, i) => {
    const total = pips[i];
    const tier = strengthTier(total);
    if (!tier) return; // a corner touching only the desert
    const x = v.x * S + offX,
      y = v.y * S + offY;
    const r = S * (0.125 + 0.005 * Math.min(total, 15));
    g.appendChild(
      svgEl("circle", {
        cx: x,
        cy: y,
        r,
        fill: tier.fill,
        stroke: "#1a1208",
        "stroke-width": "1.5",
      }),
    );
    g.appendChild(
      svgEl(
        "text",
        {
          x,
          y,
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-family": "Oswald, sans-serif",
          "font-size": `${Math.max(S * 0.14, r * 1.1).toFixed(1)}px`,
          "font-weight": "600",
          fill: tier.text,
        },
        String(total),
      ),
    );
  });
  return g;
}

// ─── Info & warnings ──────────────────────────────────────────────────────────

export function renderInfo({
  mode,
  attempts,
  elapsed,
  scoreRange,
  usedFallback,
  shared,
  score,
  valid,
  summary,
}) {
  const modeLabel = MODE_LABELS[mode];
  let pills;
  if (shared) {
    // A map opened from a link: nothing was generated in this session
    const status = valid
      ? `<span style="color:#80c840">Valid ✓ (shared link)</span>`
      : `<span style="color:#f08040">Shared link (rules not all met)</span>`;
    pills = `
    <div class="info-pill">Mode: <span>${modeLabel}</span></div>
    <div class="info-pill">Score: <span>${score}</span></div>
    <div class="info-pill">Status: ${status}</div>`;
  } else {
    const timeStr =
      elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;
    const status = usedFallback
      ? `<span style="color:#f08040">Best effort</span>`
      : `<span style="color:#80c840">Valid ✓ (best of ${attempts})</span>`;
    const scoreStr = scoreRange ? `${scoreRange[0]} → ${scoreRange[1]}` : "—";
    pills = `
    <div class="info-pill">Mode: <span>${modeLabel}</span></div>
    <div class="info-pill">Time: <span>${timeStr}</span></div>
    <div class="info-pill">Score range: <span>${scoreStr}</span></div>
    <div class="info-pill">Status: ${status}</div>`;
  }

  let fairness = "";
  if (summary) {
    const perRes = Object.keys(RESOURCE_COLORS)
      .filter((r) => r in summary.perResource)
      .map(
        (r) =>
          `<span class="res-pips" title="${RESOURCE_COLORS[r].label}: ${summary.perResource[r]} pips"><i style="background:${RESOURCE_COLORS[r].fill}"></i>${summary.perResource[r]}</span>`,
      )
      .join("");
    fairness = `
    <div class="info-pill" id="pip-best">Best spot: <span>${summary.best} pips</span></div>
    <div class="info-pill" id="pip-strong">10+ spots: <span>${summary.strong}</span></div>
    <div class="info-pill" id="pip-resources">Pips: ${perRes}</div>`;
  }

  document.getElementById("info-bar").innerHTML = pills + fairness;
}

export function renderWarnings({ usedFallback }) {
  const c = document.getElementById("warning-container");
  if (usedFallback) {
    c.innerHTML = `<div class="warning-box">⚠️ No fully valid map was found in the time budget. Showing the best attempt — try turning off a placement rule.</div>`;
  } else {
    c.innerHTML = "";
  }
}
