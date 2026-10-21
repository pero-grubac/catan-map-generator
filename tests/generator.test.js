import { test } from "node:test";
import assert from "node:assert/strict";
import { HOT, RARE, MODE_RESOURCES, MODE_NUMBERS } from "../src/constants.js";
import {
  shuffle,
  btResources,
  btNumbers,
  scoreMap,
  generateBestMap,
} from "../src/generator.js";
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
