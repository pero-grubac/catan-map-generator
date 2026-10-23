// ─── Grid ─────────────────────────────────────────────────────────────────────

export function getRowCounts(mode) {
  return mode === "extended" ? [3, 4, 5, 6, 5, 4, 3] : [3, 4, 5, 4, 3];
}

export function buildGrid(rowCounts) {
  const hexes = [];
  let id = 0;
  for (let r = 0; r < rowCounts.length; r++)
    for (let c = 0; c < rowCounts[r]; c++) hexes.push({ id: id++, r, c });
  return hexes;
}

export function rcToIdx(rowCounts, r, c) {
  if (r < 0 || r >= rowCounts.length || c < 0 || c >= rowCounts[r]) return -1;
  let idx = 0;
  for (let i = 0; i < r; i++) idx += rowCounts[i];
  return idx + c;
}

export function buildNeighborCache(hexes, rowCounts) {
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

// ─── Intersections ────────────────────────────────────────────────────────────
// Every corner of every land hex, deduplicated, with the land hexes that touch
// it (3 inland, 1–2 on the coast). Coordinates are in hex radii (S = 1) and
// use the same layout as the renderer, so it only has to scale and offset them.

export function hexCenterUnit(rowCounts, r, c) {
  const DX = Math.sqrt(3);
  const maxCols = Math.max(...rowCounts);
  return {
    x: ((maxCols - rowCounts[r]) * DX) / 2 + c * DX + DX / 2,
    y: r * 1.5 + 1,
  };
}

export function buildVertices(hexes, rowCounts) {
  const byKey = new Map();
  for (const h of hexes) {
    const { x: cx, y: cy } = hexCenterUnit(rowCounts, h.r, h.c);
    for (let i = 0; i < 6; i++) {
      // pointy-top corners, same order as the renderer's hexCorners
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + Math.cos(a),
        y = cy + Math.sin(a);
      const key = `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
      if (!byKey.has(key)) byKey.set(key, { x, y, hexes: [] });
      byKey.get(key).hexes.push(h.id);
    }
  }
  return [...byKey.values()];
}
