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
