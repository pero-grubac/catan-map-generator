import { getRowCounts, buildGrid, buildNeighborCache } from "../src/grid.js";

export const MODES = ["standard", "knights", "extended"];

export function setup(mode) {
  const rowCounts = getRowCounts(mode);
  const hexes = buildGrid(rowCounts);
  const nc = buildNeighborCache(hexes, rowCounts);
  return { rowCounts, hexes, nc };
}

// Hex centre in units of one hex width (pointy-top, rows centred), computed
// independently of the grid code so it can be used to cross-check it.
const ROW_STEP = Math.sqrt(3) / 2;

export function hexCenter(rowCounts, r, c) {
  const maxCols = Math.max(...rowCounts);
  return { x: (maxCols - rowCounts[r]) / 2 + c + 0.5, y: r * ROW_STEP };
}

// Edge index [NE, E, SE, SW, W, NW] → offset to the neighbouring hex centre
export const EDGE_OFFSETS = [
  { x: 0.5, y: -ROW_STEP },
  { x: 1, y: 0 },
  { x: 0.5, y: ROW_STEP },
  { x: -0.5, y: ROW_STEP },
  { x: -1, y: 0 },
  { x: -0.5, y: -ROW_STEP },
];

export const pointKey = ({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`;

export function countBy(arr) {
  const out = {};
  for (const v of arr) if (v !== null) out[v] = (out[v] || 0) + 1;
  return out;
}
