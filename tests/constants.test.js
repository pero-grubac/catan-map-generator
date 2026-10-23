import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import {
  NUM_DOTS,
  PORT_POSITIONS,
  MODE_RESOURCES,
  MODE_NUMBERS,
  BARBARIAN_START,
} from "../src/constants.js";
import { rcToIdx } from "../src/grid.js";
import { MODES, setup, hexCenter, EDGE_OFFSETS, pointKey } from "./helpers.js";

for (const mode of MODES) {
  test(`${mode}: tile and token counts fit the board`, () => {
    const { hexes } = setup(mode);
    const res = MODE_RESOURCES[mode];
    const tiles = Object.values(res).reduce((a, b) => a + b, 0);
    assert.equal(tiles, hexes.length);
    assert.equal(MODE_NUMBERS[mode].length, tiles - res.desert);
    for (const n of MODE_NUMBERS[mode]) assert.ok(n in NUM_DOTS, `token ${n}`);
  });

  test(`${mode}: every port faces open sea on its own sea hex`, () => {
    const { rowCounts, hexes } = setup(mode);
    const land = new Set(hexes.map((h) => pointKey(hexCenter(rowCounts, h.r, h.c))));
    const seaHexes = new Set();
    for (const p of PORT_POSITIONS[mode]) {
      assert.notEqual(rcToIdx(rowCounts, p.r, p.c), -1, `port r${p.r} c${p.c}`);
      const from = hexCenter(rowCounts, p.r, p.c);
      const off = EDGE_OFFSETS[p.edge];
      const sea = pointKey({ x: from.x + off.x, y: from.y + off.y });
      assert.ok(!land.has(sea), `port r${p.r} c${p.c} edge ${p.edge} points at land`);
      assert.ok(!seaHexes.has(sea), `two ports share sea hex ${sea}`);
      seaHexes.add(sea);
      if (p.res) assert.ok(p.res in MODE_RESOURCES[mode], `port resource ${p.res}`);
    }
  });
}

test("barbarian track starts on an east-coast land hex", () => {
  const rowCounts = setup("knights").rowCounts;
  assert.notEqual(rcToIdx(rowCounts, BARBARIAN_START.r, BARBARIAN_START.c), -1);
  assert.equal(rcToIdx(rowCounts, BARBARIAN_START.r, BARBARIAN_START.c + 1), -1);
});

test("service worker caches every source module and asset", () => {
  const sw = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const shell = sw.match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(shell, "SHELL list not found");
  const assets = [...shell[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const a of assets) {
    assert.ok(existsSync(new URL(`../${a}`, import.meta.url)), `missing ${a}`);
  }
  // every module under src/ must be precached, or the app breaks offline
  for (const f of readdirSync(new URL("../src/", import.meta.url))) {
    if (f.endsWith(".js")) assert.ok(assets.includes(`src/${f}`), `src/${f} not cached`);
  }
});
