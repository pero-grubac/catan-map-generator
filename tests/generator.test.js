import { test } from "node:test";
import assert from "node:assert/strict";
import { HOT, RARE, MODE_RESOURCES, MODE_NUMBERS } from "../src/constants.js";
import {
  shuffle,
  btResources,
  btNumbers,
  scoreMap,
  generateBestMap,
  pipsOf,
  vertexPips,
  pipSummary,
  checkRules,
} from "../src/generator.js";
import { buildVertices } from "../src/grid.js";
import { MODES, setup, countBy } from "./helpers.js";

const RUNS = 50;

function adjacentPairs(nc) {
  const pairs = [];
  nc.forEach((ns, i) => ns.forEach((n) => n > i && pairs.push([i, n])));
  return pairs;
}

function assertValidMap(mode, nc, { resourceArr, numberArr }, rules) {
  assert.deepEqual(countBy(resourceArr), MODE_RESOURCES[mode]);
  assert.deepEqual(countBy(numberArr), countBy(MODE_NUMBERS[mode]));
  resourceArr.forEach((r, i) =>
    assert.equal(numberArr[i] === null, r === "desert", `hex ${i}`),
  );
  for (const [a, b] of adjacentPairs(nc)) {
    const [na, nb] = [numberArr[a], numberArr[b]];
    if (rules.noSameRes) assert.notEqual(resourceArr[a], resourceArr[b]);
    if (rules.no68) assert.ok(!(HOT.has(na) && HOT.has(nb)), `6/8 at ${a},${b}`);
    if (rules.no212) assert.ok(!(RARE.has(na) && RARE.has(nb)), `2/12 at ${a},${b}`);
  }
}

test("shuffle keeps all elements and does not mutate the input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});

for (const mode of MODES) {
  test(`${mode}: btResources uses exact tile counts with no same-resource neighbours`, () => {
    const { hexes, nc } = setup(mode);
    for (let i = 0; i < RUNS; i++) {
      const res = btResources(hexes, nc, MODE_RESOURCES[mode]);
      assert.ok(res, "no layout found");
      assert.deepEqual(countBy(res), MODE_RESOURCES[mode]);
      for (const [a, b] of adjacentPairs(nc)) assert.notEqual(res[a], res[b]);
    }
  });

  test(`${mode}: btNumbers places every token with no 6/8 or 2/12 neighbours`, () => {
    const { hexes, nc } = setup(mode);
    let found = 0;
    for (let i = 0; i < RUNS; i++) {
      const resourceArr = btResources(hexes, nc, MODE_RESOURCES[mode]);
      const numberArr = btNumbers(
        hexes, nc, resourceArr, MODE_NUMBERS[mode], true, true, Date.now() + 500,
      );
      if (!numberArr) continue; // timed out on a hard layout; allowed
      found++;
      assertValidMap(mode, nc, { resourceArr, numberArr }, {
        noSameRes: true, no68: true, no212: true,
      });
    }
    assert.ok(found > RUNS / 2, `only ${found}/${RUNS} succeeded`);
  });

  test(`${mode}: generateBestMap returns a valid best-scored map`, () => {
    const { hexes, nc } = setup(mode);
    const rules = { noSameRes: true, no68: true, no212: true };
    const result = generateBestMap({
      hexes, nc, available: MODE_RESOURCES[mode], numbers: MODE_NUMBERS[mode],
      ...rules, totalTimeout: 1000,
    });
    assert.equal(result.usedFallback, false);
    assert.ok(result.attempts > 0);
    assert.ok(result.scoreRange[0] >= result.scoreRange[1]);
    assert.equal(result.score, result.scoreRange[0]);
    assertValidMap(mode, nc, result, rules);
  });
}

test("generateBestMap with all rules off still uses the full tile set", () => {
  const mode = "extended";
  const { hexes, nc } = setup(mode);
  const result = generateBestMap({
    hexes, nc, available: MODE_RESOURCES[mode], numbers: MODE_NUMBERS[mode],
    noSameRes: false, no68: false, no212: false, totalTimeout: 200,
  });
  assertValidMap(mode, nc, result, {});
});

test("btNumbers returns null once the deadline has passed", () => {
  const { hexes, nc } = setup("standard");
  const resourceArr = btResources(hexes, nc, MODE_RESOURCES.standard);
  const out = btNumbers(
    hexes, nc, resourceArr, MODE_NUMBERS.standard, true, true, Date.now() - 1,
  );
  assert.equal(out, null);
});

test("generateBestMap falls back when no attempt can finish", () => {
  const { hexes, nc } = setup("standard");
  const result = generateBestMap({
    hexes, nc, available: MODE_RESOURCES.standard, numbers: MODE_NUMBERS.standard,
    noSameRes: true, no68: true, no212: true, totalTimeout: 50, perAttempt: -1,
  });
  assert.equal(result.usedFallback, true);
  assert.equal(result.attempts, 0);
  assertValidMap("standard", nc, result, {});
});

test("scoreMap penalises adjacency violations", () => {
  // Three hexes in a row: 0 – 1 – 2
  const hexes = [{}, {}, {}];
  const nc = [[1], [0, 2], [1]];
  const res = ["forest", "hills", "forest"];
  const balanced = scoreMap(hexes, nc, res, [5, 9, null]); // 4 dots vs 4 dots

  assert.equal(balanced, 0);
  assert.equal(scoreMap(hexes, nc, ["forest", "forest", "hills"], [5, 9, null]), -20);
  assert.equal(scoreMap(hexes, nc, res, [6, 8, null]), -100);
  assert.equal(scoreMap(hexes, nc, res, [2, 12, null]), -40);
});

test("scoreMap penalises uneven probability per resource", () => {
  const hexes = [{}, {}];
  const nc = [[], []];
  // forest 5 dots, hills 1 dot → variance 4
  assert.equal(scoreMap(hexes, nc, ["forest", "hills"], [6, 2]), -4);
});

test("pip table: 2/12=1, 3/11=2, 4/10=3, 5/9=4, 6/8=5, desert 0", () => {
  const expected = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  for (const [n, p] of Object.entries(expected)) assert.equal(pipsOf(Number(n)), p, `${n}`);
  assert.equal(pipsOf(null), 0);
});

test("an intersection's pips are the sum over its land hexes", () => {
  const vertices = [
    { hexes: [0, 1, 2] }, // 6 + 8 + desert
    { hexes: [1, 3] }, // coast: 8 + 2
    { hexes: [3] }, // corner: 2
    { hexes: [2] }, // desert only
  ];
  const numberArr = [6, 8, null, 2];
  assert.deepEqual(vertexPips(vertices, numberArr), [10, 6, 1, 0]);
});

test("pipSummary reports best spot, 10+ spots and pips per resource", () => {
  const vertices = [{ hexes: [0, 1, 2] }, { hexes: [1, 3] }, { hexes: [0, 3] }];
  const resourceArr = ["forest", "hills", "desert", "forest"];
  const numberArr = [6, 9, null, 12];
  const s = pipSummary(vertices, resourceArr, numberArr);
  assert.deepEqual(s.totals, [9, 5, 6]);
  assert.equal(s.best, 9);
  assert.equal(s.strong, 0);
  assert.deepEqual(s.perResource, { forest: 6, hills: 4 });
  assert.equal(pipSummary([{ hexes: [0, 1] }], ["forest", "hills"], [6, 9]).strong, 0);
  assert.equal(pipSummary([{ hexes: [0, 1, 2] }], ["forest", "hills", "fields"], [6, 9, 2]).strong, 1);
});

for (const mode of MODES) {
  test(`${mode}: pips over all intersections add up to 6 × the token pips`, () => {
    // every hex has six corners, so each token is counted six times
    const { rowCounts, hexes, nc } = setup(mode);
    const result = generateBestMap({
      hexes, nc, available: MODE_RESOURCES[mode], numbers: MODE_NUMBERS[mode],
      noSameRes: false, no68: false, no212: false, totalTimeout: 50,
    });
    const s = pipSummary(buildVertices(hexes, rowCounts), result.resourceArr, result.numberArr);
    const tokenPips = MODE_NUMBERS[mode].reduce((a, n) => a + pipsOf(n), 0);
    assert.equal(s.totals.reduce((a, b) => a + b, 0), 6 * tokenPips);
    assert.equal(Object.values(s.perResource).reduce((a, b) => a + b, 0), tokenPips);
    assert.ok(!("desert" in s.perResource));
    assert.ok(s.best <= 15);
  });
}

test("checkRules flags each broken rule only when it is enabled", () => {
  const nc = [[1], [0]];
  const all = { no68: true, no212: true, noSameRes: true };
  assert.equal(checkRules(nc, ["forest", "hills"], [5, 9], all), true);
  assert.equal(checkRules(nc, ["forest", "forest"], [5, 9], all), false);
  assert.equal(checkRules(nc, ["forest", "hills"], [6, 8], all), false);
  assert.equal(checkRules(nc, ["forest", "hills"], [2, 12], all), false);
  assert.equal(checkRules(nc, ["forest", "forest"], [6, 8], {}), true);
});
