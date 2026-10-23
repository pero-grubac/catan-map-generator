import { test } from "node:test";
import assert from "node:assert/strict";
import { MODE_RESOURCES, MODE_NUMBERS } from "../src/constants.js";
import { generateBestMap } from "../src/generator.js";
import { encodeMap, decodeMap, SHARE_VERSION } from "../src/share.js";
import { MODES, setup } from "./helpers.js";

function makeMap(mode, rules) {
  const { hexes, nc } = setup(mode);
  const { resourceArr, numberArr } = generateBestMap({
    hexes, nc, available: MODE_RESOURCES[mode], numbers: MODE_NUMBERS[mode],
    ...rules, totalTimeout: 100,
  });
  return { mode, resourceArr, numberArr, rules };
}

const RULE_SETS = [
  { no68: true, no212: true, noSameRes: true },
  { no68: false, no212: true, noSameRes: false },
  { no68: false, no212: false, noSameRes: false },
];

// base64url → bytes and back, to build hand-crafted corrupt codes
const toBytes = (code) =>
  Uint8Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const toCode = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

for (const mode of MODES) {
  test(`${mode}: a map survives encode → decode unchanged`, () => {
    for (const rules of RULE_SETS) {
      for (let i = 0; i < 10; i++) {
        const map = makeMap(mode, rules);
        const code = encodeMap(map);
        assert.match(code, /^[A-Za-z0-9_-]+$/, "URL-safe, no padding");
        assert.deepEqual(decodeMap(code), map);
        assert.deepEqual(decodeMap("#" + code), map, "leading # is accepted");
      }
    }
  });
}

test("codes are compact: one byte per land hex plus a two-byte header", () => {
  const std = encodeMap(makeMap("standard", RULE_SETS[0]));
  const ext = encodeMap(makeMap("extended", RULE_SETS[0]));
  assert.equal(std.length, 28); // 21 bytes
  assert.equal(ext.length, 43); // 32 bytes
  assert.equal(toBytes(std)[0], SHARE_VERSION);
});

test("standard and knights maps with the same tiles get different codes", () => {
  const map = makeMap("standard", RULE_SETS[0]);
  const a = encodeMap(map);
  const b = encodeMap({ ...map, mode: "knights" });
  assert.notEqual(a, b);
  assert.equal(decodeMap(b).mode, "knights");
});

test("garbage and empty input decode to null", () => {
  for (const bad of [undefined, null, 42, "", "#", "!!!", "hello world", "%%", "a", "AAAA", "#map=xyz"]) {
    assert.equal(decodeMap(bad), null, String(bad));
  }
});

test("corrupt codes are rejected instead of drawing a broken map", () => {
  const map = makeMap("standard", RULE_SETS[0]);
  const good = toBytes(encodeMap(map));
  const variant = (fn) => {
    const b = Uint8Array.from(good);
    fn(b);
    return toCode(b);
  };
  const desertAt = map.resourceArr.indexOf("desert") + 2;
  const tokenAt = desertAt === 2 ? 3 : 2;

  assert.equal(decodeMap(variant((b) => (b[0] = 2))), null, "unknown version");
  assert.equal(decodeMap(variant((b) => (b[1] = 3))), null, "unknown mode");
  assert.equal(decodeMap(variant((b) => (b[1] |= 0x80))), null, "unknown flag");
  assert.equal(decodeMap(toCode(good.subarray(0, -1))), null, "truncated");
  assert.equal(decodeMap(toCode([...good, 0x25])), null, "too long");
  assert.equal(decodeMap(variant((b) => (b[1] = (b[1] & ~3) | 2))), null, "standard tiles as extended");
  assert.equal(decodeMap(variant((b) => (b[tokenAt] = 0x60 | 5))), null, "resource index 6");
  assert.equal(decodeMap(variant((b) => (b[desertAt] = 0x55))), null, "desert with a token");
  assert.equal(decodeMap(variant((b) => (b[tokenAt] &= 0xf0))), null, "land without a token");
  assert.equal(decodeMap(variant((b) => (b[tokenAt] = (b[tokenAt] & 0xf0) | 7))), null, "a 7 token");
  // swap one tile's resource for another: counts no longer match the box
  assert.equal(
    decodeMap(variant((b) => (b[tokenAt] = (((b[tokenAt] >> 4) + 1) % 5 << 4) | (b[tokenAt] & 15)))),
    null,
    "wrong tile counts",
  );
  // swap one token's number: counts no longer match the box
  assert.equal(
    decodeMap(variant((b) => (b[tokenAt] = (b[tokenAt] & 0xf0) | ((b[tokenAt] & 15) === 2 ? 3 : 2)))),
    null,
    "wrong token counts",
  );
});

test("encodeMap refuses unknown modes and resources", () => {
  const map = makeMap("standard", RULE_SETS[0]);
  assert.throws(() => encodeMap({ ...map, mode: "seafarers" }));
  assert.throws(() => encodeMap({ ...map, resourceArr: map.resourceArr.map(() => "gold") }));
});
