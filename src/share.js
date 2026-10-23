import { MODE_RESOURCES, MODE_NUMBERS } from "./constants.js";
import { getRowCounts } from "./grid.js";

// ─── Share links ──────────────────────────────────────────────────────────────
// Generation is time-budgeted, so a random seed would not give the same map
// twice. A link therefore stores the finished map itself, packed into bytes
// and written as base64url in the URL hash:
//
//   byte 0      format version (1)
//   byte 1      bits 0-1 mode · bit 2 no 6/8 · bit 3 no 2/12 · bit 4 no same resource
//   byte 2…     one per land hex in grid order:
//               high nibble = resource index, low nibble = number (0 = desert)
//
// A standard board is 21 bytes (28 characters), the extended one 32 (43).

export const SHARE_VERSION = 1;
export const SHARE_MODES = ["standard", "knights", "extended"];
export const SHARE_RESOURCES = [
  "forest",
  "fields",
  "pasture",
  "mountains",
  "hills",
  "desert",
];

const FLAG_68 = 1 << 2;
const FLAG_212 = 1 << 3;
const FLAG_SAME_RES = 1 << 4;

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str) {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) return null;
  try {
    const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

export function encodeMap({ mode, resourceArr, numberArr, rules = {} }) {
  const modeIdx = SHARE_MODES.indexOf(mode);
  if (modeIdx === -1) throw new Error(`unknown mode ${mode}`);
  const flags =
    (rules.no68 ? FLAG_68 : 0) |
    (rules.no212 ? FLAG_212 : 0) |
    (rules.noSameRes ? FLAG_SAME_RES : 0);
  const bytes = [SHARE_VERSION, modeIdx | flags];
  resourceArr.forEach((r, i) => {
    const ri = SHARE_RESOURCES.indexOf(r);
    if (ri === -1) throw new Error(`unknown resource ${r}`);
    bytes.push((ri << 4) | (numberArr[i] ?? 0));
  });
  return toBase64Url(bytes);
}

// Returns { mode, resourceArr, numberArr, rules } or null for anything that is
// not a complete, legal map (wrong version, size, tile or token set…).
export function decodeMap(code) {
  if (typeof code !== "string") return null;
  const bytes = fromBase64Url(code.replace(/^#/, ""));
  if (!bytes || bytes.length < 2 || bytes[0] !== SHARE_VERSION) return null;

  const modeIdx = bytes[1] & 3;
  if (bytes[1] & ~(3 | FLAG_68 | FLAG_212 | FLAG_SAME_RES)) return null;
  const mode = SHARE_MODES[modeIdx];
  if (!mode) return null;

  const tiles = getRowCounts(mode).reduce((a, b) => a + b, 0);
  if (bytes.length !== 2 + tiles) return null;

  const resourceArr = [];
  const numberArr = [];
  for (const b of bytes.subarray(2)) {
    const res = SHARE_RESOURCES[b >> 4];
    const num = b & 15;
    if (!res) return null;
    if ((res === "desert") !== (num === 0)) return null;
    resourceArr.push(res);
    numberArr.push(num === 0 ? null : num);
  }

  // Same tiles and tokens as the real box, nothing more or less
  if (!sameCounts(resourceArr, Object.entries(MODE_RESOURCES[mode]))) return null;
  const tokenCounts = {};
  for (const n of MODE_NUMBERS[mode]) tokenCounts[n] = (tokenCounts[n] || 0) + 1;
  if (!sameCounts(numberArr.filter((n) => n !== null), Object.entries(tokenCounts)))
    return null;

  return {
    mode,
    resourceArr,
    numberArr,
    rules: {
      no68: Boolean(bytes[1] & FLAG_68),
      no212: Boolean(bytes[1] & FLAG_212),
      noSameRes: Boolean(bytes[1] & FLAG_SAME_RES),
    },
  };
}

function sameCounts(values, expected) {
  const got = {};
  for (const v of values) got[v] = (got[v] || 0) + 1;
  if (Object.keys(got).length !== expected.length) return false;
  return expected.every(([k, n]) => got[k] === n);
}
