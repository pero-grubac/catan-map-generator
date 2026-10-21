import { HOT, RARE, NUM_DOTS } from "./constants.js";

// ─── Utilities ────────────────────────────────────────────────────────────────

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Backtracking: resources ──────────────────────────────────────────────────
// Visits hexes in a random order (shuffled before each run) so rare resources
// like desert are never biased toward the end of the grid.
// Resource types are tried in fully random order at each hex.
// Guarantees no same-resource adjacency.

export function btResources(hexes, nc, available) {
  const total = hexes.length;
  const assigned = new Array(total).fill(null); // indexed by hex id
  const rem = { ...available };

  // Shuffle the visit order so every hex has equal chance of getting any resource
  const visitOrder = shuffle([...Array(total).keys()]);

  function bt(step) {
    if (step === total) return true;

    const pos = visitOrder[step];
    const types = shuffle(Object.keys(rem).filter((r) => rem[r] > 0));

    for (const res of types) {
      // Check against already-assigned neighbours (only those visited before this step)
      let valid = true;
      for (const n of nc[pos]) {
        if (assigned[n] === res) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      assigned[pos] = res;
      rem[res]--;
      if (bt(step + 1)) return true;
      assigned[pos] = null;
      rem[res]++;
    }
    return false;
  }

  return bt(0) ? [...assigned] : null;
}

// ─── Backtracking: numbers ───────────────────────────────────────────────────
// Slots sorted by degree desc (hardest first → less backtracking).
// Aborts early if `deadline` is exceeded so caller can restart fresh.

export function btNumbers(hexes, nc, resourceArr, pool, no68, no212, deadline) {
  const landIdx = resourceArr.reduce(
    (a, r, i) => (r !== "desert" ? [...a, i] : a),
    [],
  );
  // Highest-degree land tiles first
  landIdx.sort((a, b) => nc[b].length - nc[a].length);

  const assigned = new Array(hexes.length).fill(null);
  const nums = shuffle([...pool]);
  const used = new Array(nums.length).fill(false);
  let aborted = false;

  function bt(slot) {
    if (aborted) return false;
    if (Date.now() > deadline) {
      aborted = true;
      return false;
    }
    if (slot === landIdx.length) return true;

    const hi = landIdx[slot];
    const order = shuffle([...nums.keys()].filter((i) => !used[i]));

    for (const ni of order) {
      const num = nums[ni];
      let valid = true;
      for (const n of nc[hi]) {
        const b = assigned[n];
        if (b === null) continue;
        if (no68 && HOT.has(num) && HOT.has(b)) {
          valid = false;
          break;
        }
        if (no212 && RARE.has(num) && RARE.has(b)) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      assigned[hi] = num;
      used[ni] = true;
      if (bt(slot + 1)) return true;
      assigned[hi] = null;
      used[ni] = false;
    }
    return false;
  }

  return !bt(0) || aborted ? null : [...assigned];
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
// Lower is worse, higher is better. Zero = perfect.

export function scoreMap(hexes, nc, resourceArr, numberArr) {
  let score = 0;

  for (let i = 0; i < hexes.length; i++) {
    for (const n of nc[i]) {
      if (n <= i) continue;
      if (resourceArr[i] === resourceArr[n]) score -= 20;
      if (
        numberArr[i] &&
        numberArr[n] &&
        HOT.has(numberArr[i]) &&
        HOT.has(numberArr[n])
      )
        score -= 100;
      if (
        numberArr[i] &&
        numberArr[n] &&
        RARE.has(numberArr[i]) &&
        RARE.has(numberArr[n])
      )
        score -= 40;
    }
  }

  // Penalise unbalanced probability distribution per resource type
  const prob = {};
  for (let i = 0; i < hexes.length; i++) {
    if (!numberArr[i]) continue;
    const r = resourceArr[i];
    prob[r] = (prob[r] || 0) + NUM_DOTS[numberArr[i]];
  }
  const vals = Object.values(prob);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
  score -= Math.round(variance);

  return score;
}

// ─── Generate best map ────────────────────────────────────────────────────────
// Strategy:
//   1. Backtrack resources (guaranteed valid if constraints enabled)
//   2. Backtrack numbers with a per-attempt deadline; restart if deadline hit
//   3. Collect up to TARGET candidates within TOTAL_TIMEOUT, return highest-scored

export function generateBestMap({
  hexes,
  nc,
  available,
  numbers,
  no68,
  no212,
  noSameRes,
  totalTimeout = 2500,
  perAttempt = 150,
  target = 8,
}) {
  const candidates = [];
  const globalStart = Date.now();

  // Fallback: first valid placement without number constraints
  let fallback = null;

  while (
    Date.now() - globalStart < totalTimeout &&
    candidates.length < target
  ) {
    // Step 1: resource layout (backtracking if noSameRes, else random)
    let resourceArr;
    if (noSameRes) {
      resourceArr = btResources(hexes, nc, available);
      if (!resourceArr) continue; // shouldn't happen but guard anyway
    } else {
      const flat = Object.entries(available).flatMap(([r, n]) =>
        Array(n).fill(r),
      );
      resourceArr = shuffle(flat);
    }

    // Fallback built from first resource layout (no number constraints)
    if (!fallback) {
      const li = resourceArr.reduce(
        (a, r, i) => (r !== "desert" ? [...a, i] : a),
        [],
      );
      const na = new Array(hexes.length).fill(null);
      shuffle(numbers).forEach((n, ni) => {
        if (li[ni] !== undefined) na[li[ni]] = n;
      });
      fallback = {
        resourceArr: [...resourceArr],
        numberArr: na,
        score: scoreMap(hexes, nc, resourceArr, na),
      };
    }

    // Step 2: number layout
    let numberArr;
    if (no68 || no212) {
      numberArr = btNumbers(
        hexes,
        nc,
        resourceArr,
        numbers,
        no68,
        no212,
        Date.now() + perAttempt,
      );
      if (!numberArr) continue; // timed out, retry
    } else {
      const li = resourceArr.reduce(
        (a, r, i) => (r !== "desert" ? [...a, i] : a),
        [],
      );
      numberArr = new Array(hexes.length).fill(null);
      shuffle(numbers).forEach((n, ni) => {
        if (li[ni] !== undefined) numberArr[li[ni]] = n;
      });
    }

    candidates.push({
      resourceArr,
      numberArr,
      score: scoreMap(hexes, nc, resourceArr, numberArr),
    });
  }

  if (candidates.length === 0)
    return {
      ...fallback,
      attempts: 0,
      elapsed: Date.now() - globalStart,
      usedFallback: true,
    };

  candidates.sort((a, b) => b.score - a.score);
  return {
    ...candidates[0],
    attempts: candidates.length,
    elapsed: Date.now() - globalStart,
    usedFallback: false,
    scoreRange: [candidates[0].score, candidates[candidates.length - 1].score],
  };
}
