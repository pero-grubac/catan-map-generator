import { test } from "node:test";
import assert from "node:assert/strict";
import { getRowCounts, buildGrid, rcToIdx } from "../src/grid.js";
import { MODES, setup, hexCenter } from "./helpers.js";

test("row layouts have 19 and 30 land hexes", () => {
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  assert.equal(sum(getRowCounts("standard")), 19);
  assert.equal(sum(getRowCounts("knights")), 19);
  assert.equal(sum(getRowCounts("extended")), 30);
});

test("buildGrid assigns sequential ids matching rcToIdx", () => {
  const rowCounts = getRowCounts("extended");
  buildGrid(rowCounts).forEach((h, i) => {
    assert.equal(h.id, i);
    assert.equal(rcToIdx(rowCounts, h.r, h.c), i);
  });
});

test("rcToIdx returns -1 outside the board", () => {
  const rowCounts = getRowCounts("standard");
  assert.equal(rcToIdx(rowCounts, -1, 0), -1);
  assert.equal(rcToIdx(rowCounts, 0, -1), -1);
  assert.equal(rcToIdx(rowCounts, 0, 3), -1);
  assert.equal(rcToIdx(rowCounts, 5, 0), -1);
});

for (const mode of MODES) {
  test(`${mode}: neighbours match hex geometry`, () => {
    const { rowCounts, hexes, nc } = setup(mode);
    const pts = hexes.map((h) => hexCenter(rowCounts, h.r, h.c));
    for (let i = 0; i < hexes.length; i++) {
      const expected = [];
      for (let j = 0; j < hexes.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (i !== j && Math.abs(d - 1) < 1e-6) expected.push(j);
      }
      assert.deepEqual(
        [...nc[i]].sort((a, b) => a - b),
        expected,
        `hex ${i} (r${hexes[i].r} c${hexes[i].c})`,
      );
    }
  });

  test(`${mode}: neighbour relation is symmetric`, () => {
    const { nc } = setup(mode);
    nc.forEach((ns, i) => {
      for (const n of ns) assert.ok(nc[n].includes(i), `${i} ↔ ${n}`);
    });
  });
}
