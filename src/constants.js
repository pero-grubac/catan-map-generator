// ─── Constants ────────────────────────────────────────────────────────────────

export const RESOURCE_COLORS = {
  forest: { fill: "#3d6b1a", stroke: "#2a4d0f", label: "Forest" },
  fields: { fill: "#c8a840", stroke: "#a08020", label: "Grain" },
  pasture: { fill: "#7ab828", stroke: "#558a10", label: "Sheep" },
  mountains: { fill: "#7a5030", stroke: "#5a3820", label: "Rock" },
  hills: { fill: "#c86030", stroke: "#a04020", label: "Clay" },
  desert: { fill: "#d8c878", stroke: "#b8a858", label: "Desert" },
};

// Per-resource fractal-noise parameters used to give each tile a painted,
// textured surface instead of a flat fill (see buildNoiseFilter/TEXTURE_CONFIG).
export const TEXTURE_CONFIG = {
  forest: { baseFreqX: 0.028, octaves: 2, seed: 4, gamma: 1.4 },
  fields: { baseFreqX: 0.012, baseFreqY: 0.16, octaves: 2, seed: 9, gamma: 1.6 },
  pasture: { baseFreqX: 0.07, octaves: 3, seed: 12, gamma: 2.0 },
  mountains: { baseFreqX: 0.05, octaves: 5, seed: 21, gamma: 1.2 },
  hills: { baseFreqX: 0.035, octaves: 3, seed: 33, gamma: 1.5 },
  desert: { baseFreqX: 0.12, octaves: 2, seed: 44, gamma: 2.2 },
  sea: { baseFreqX: 0.09, baseFreqY: 0.04, octaves: 2, seed: 61, gamma: 2.4 },
};

// Icon fill colour tuned per resource for contrast against its tile colour.
export const ICON_COLORS = {
  forest: "rgba(235,240,215,0.92)",
  fields: "rgba(55,38,8,0.8)",
  pasture: "rgba(255,255,255,0.92)",
  mountains: "rgba(255,255,255,0.92)",
  hills: "rgba(255,255,255,0.92)",
  desert: "rgba(80,54,16,0.82)",
};

export const NUM_DOTS = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};
export const HOT = new Set([6, 8]);
export const RARE = new Set([2, 12]);

// Standard (3-4p): 19 land tiles
export const STD_RESOURCES = {
  forest: 4,
  fields: 4,
  pasture: 4,
  mountains: 3,
  hills: 3,
  desert: 1,
};
export const STD_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// Extended (5-6p): 30 land tiles, no gold, 2 deserts
export const EXT_RESOURCES = {
  forest: 6,
  fields: 6,
  pasture: 6,
  mountains: 5,
  hills: 5,
  desert: 2,
};
export const EXT_NUMBERS = [
  2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11,
  11, 11, 12, 12,
];

// ─── Ports ────────────────────────────────────────────────────────────────────
// Port positions are FIXED per official Catan layout.
// Each entry: { r, c } = land hex, edge = exposed side, type data fixed.

export const STD_PORT_POSITIONS = [
  { r: 0, c: 1, edge: 5, label: "3:1", res: null },
  { r: 0, c: 2, edge: 0, label: "3:1", res: null },
  { r: 1, c: 3, edge: 1, label: "2:1", res: "hills" },
  { r: 2, c: 4, edge: 2, label: "2:1", res: "forest" },
  { r: 4, c: 2, edge: 2, label: "3:1", res: null },
  { r: 4, c: 1, edge: 3, label: "2:1", res: "fields" },
  { r: 3, c: 0, edge: 3, label: "2:1", res: "mountains" },
  { r: 2, c: 0, edge: 4, label: "3:1", res: null },
  { r: 1, c: 0, edge: 5, label: "2:1", res: "pasture" },
];

export const EXT_PORT_POSITIONS = [
  { r: 0, c: 0, edge: 5, label: "3:1", res: null },
  { r: 0, c: 1, edge: 0, label: "2:1", res: "pasture" },
  { r: 1, c: 3, edge: 0, label: "3:1", res: null },
  { r: 3, c: 5, edge: 1, label: "3:1", res: null },
  { r: 4, c: 4, edge: 2, label: "2:1", res: "hills" },
  { r: 5, c: 3, edge: 2, label: "2:1", res: "pasture" },
  { r: 6, c: 2, edge: 3, label: "2:1", res: "forest" },
  { r: 6, c: 0, edge: 3, label: "3:1", res: null },
  { r: 3, c: 0, edge: 5, label: "2:1", res: "mountains" },
  { r: 4, c: 0, edge: 4, label: "3:1", res: null },
  { r: 5, c: 0, edge: 4, label: "2:1", res: "fields" },
];

// Cities & Knights (3-4p): same 19-hex board as Standard, but the printed
// frame has a different harbour layout.
export const CK_PORT_POSITIONS = [
  { r: 0, c: 1, edge: 5, label: "2:1", res: "mountains" },
  { r: 0, c: 2, edge: 1, label: "2:1", res: "forest" },
  // inset: shifts the harbour icon toward the shore (in hex radii) to leave
  // room for the barbarian track on its seaward side
  { r: 3, c: 3, edge: 1, label: "3:1", res: null, inset: 0.22 },
  { r: 4, c: 2, edge: 2, label: "3:1", res: null },
  { r: 4, c: 1, edge: 3, label: "2:1", res: "fields" },
  { r: 4, c: 0, edge: 3, label: "3:1", res: null },
  { r: 3, c: 0, edge: 4, label: "2:1", res: "pasture" },
  { r: 2, c: 0, edge: 4, label: "3:1", res: null },
  { r: 1, c: 0, edge: 5, label: "2:1", res: "hills" },
];

// Barbarian track (Cities & Knights): a pirate ship at both ends (it starts at
// the far end and sails toward the coast) and 6 waves between, drawn as marks
// inside the existing sea hexes along the east coast (on the offshore side of
// the harbour there), so no extra hexes are needed. Offsets are in hex-widths
// (DX) from the centre of the sea hex east of BARBARIAN_START.
// Positions are chosen so each mark (at its drawn size) lies fully inside one
// sea hex and clear of the harbour icon in the hex east of (3,3).
export const BARBARIAN_START = { r: 2, c: 4 };
export const BARBARIAN_MARKS = [
  { x: 0.235, y: -0.207 },
  { x: 0.343, y: 0.018 },
  { x: 0.063, y: 0.316 },
  { x: -0.153, y: 0.722 },
  { x: -0.289, y: 1.083 },
  { x: -0.731, y: 1.534 },
  { x: -0.758, y: 1.768 },
  { x: -0.938, y: 2.039 },
];
// Pirate-flag crimson with a cream rim: stands out on the blue sea and is
// distinct from the white harbour icons and the number tokens on land.
export const BARBARIAN_COLORS = { fill: "#b8322a", rim: "#f3e3c3" };

export const PORT_POSITIONS = {
  standard: STD_PORT_POSITIONS,
  knights: CK_PORT_POSITIONS,
  extended: EXT_PORT_POSITIONS,
};

// Cities & Knights uses the standard 19-tile board
export const MODE_RESOURCES = {
  standard: STD_RESOURCES,
  knights: STD_RESOURCES,
  extended: EXT_RESOURCES,
};

export const MODE_NUMBERS = {
  standard: STD_NUMBERS,
  knights: STD_NUMBERS,
  extended: EXT_NUMBERS,
};

export const MODE_LABELS = {
  standard: "Standard (3-4p)",
  knights: "Cities & Knights (3-4p)",
  extended: "Extended (5-6p)",
};

// Outward angle (degrees) for each edge direction
export const EDGE_ANGLE = [30, 90, 150, 210, 270, 330]; // NE,E,SE,SW,W,NW
