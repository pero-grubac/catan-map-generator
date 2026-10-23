import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getRowCounts,
  buildGrid,
  rcToIdx,
  buildVertices,
  hexCenterUnit,
} from "../src/grid.js";
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

const VERTEX_COUNTS = { standard: 54, knights: 54, extended: 80 };

for (const mode of MODES) {
  test(`${mode}: ${VERTEX_COUNTS[mode]} intersections, every hex corner counted once`, () => {
    const { rowCounts, hexes } = setup(mode);
    const vertices = buildVertices(hexes, rowCounts);
    assert.equal(vertices.length, VERTEX_COUNTS[mode]);
    // each hex has 6 corners, so the hex lists add up to 6 × hexes
    const refs = vertices.reduce((a, v) => a + v.hexes.length, 0);
    assert.equal(refs, 6 * hexes.length);
    for (const h of hexes) {
      assert.equal(vertices.filter((v) => v.hexes.includes(h.id)).length, 6, `hex ${h.id}`);
    }
  });

  test(`${mode}: hexes sharing an intersection are neighbours`, () => {
    const { rowCounts, hexes, nc } = setup(mode);
    for (const v of buildVertices(hexes, rowCounts)) {
      assert.ok(v.hexes.length >= 1 && v.hexes.length <= 3);
      for (const a of v.hexes)
        for (const b of v.hexes) if (a !== b) assert.ok(nc[a].includes(b), `${a} ↔ ${b}`);
      // and the corner is one hex radius from each of their centres
      for (const h of v.hexes) {
        const c = hexCenterUnit(rowCounts, hexes[h].r, hexes[h].c);
        assert.ok(Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - 1) < 1e-9);
      }
    }
  });
}

test("standard board: 24 inland intersections, 30 on the coast", () => {
  const { rowCounts, hexes } = setup("standard");
  const vertices = buildVertices(hexes, rowCounts);
  const by = (k) => vertices.filter((v) => v.hexes.length === k).length;
  assert.equal(by(3), 24);
  assert.equal(by(2), 12);
  assert.equal(by(1), 18);
});
