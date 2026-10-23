// Smoke tests: every mode generates, share links reproduce the exact map, the
// intersection overlay toggles, PNG export downloads, and the phone layout fits.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const LAND_TILES = { standard: 19, knights: 19, extended: 30 };
const CODE_LENGTH = { standard: 28, knights: 28, extended: 43 };

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.errors = errors;
  // Record what would be copied or shared instead of touching the real clipboard
  await page.addInitScript(() => {
    window.__shared = [];
    const keep = async (v) => window.__shared.push(typeof v === "string" ? v : v.url);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: keep }, configurable: true });
    Object.defineProperty(navigator, "share", { value: keep, configurable: true });
  });
});

test.afterEach(async ({ page }) => {
  expect(page.errors, "no JavaScript errors").toEqual([]);
});

async function waitForMap(page) {
  await expect(page.locator(".btn-generate")).toBeEnabled({ timeout: 10_000 });
  await expect(page.locator("#info-bar")).toContainText("Status");
}

const landTiles = (page) => page.locator("#map-svg > g:not(.strength-overlay)");

test("generates a map in all three modes and keeps it in the URL", async ({ page }) => {
  await page.goto("./");
  await waitForMap(page);
  await expect(page).toHaveTitle("Catan Map Generator");

  for (const mode of ["standard", "knights", "extended"]) {
    await page.click(`#tab-${mode}`);
    await waitForMap(page);
    await expect(page.locator(`#tab-${mode}`)).toHaveClass(/active/);
    await expect(landTiles(page)).toHaveCount(LAND_TILES[mode]);
    const hash = await page.evaluate(() => location.hash.slice(1));
    expect(hash).toMatch(new RegExp(`^[A-Za-z0-9_-]{${CODE_LENGTH[mode]}}$`));
    await expect(page.locator("#pip-best")).toContainText("pips");
  }
  // the barbarian track is only drawn on the Cities & Knights board
  await expect(page.locator(".legend-knights")).toBeHidden();
});

test("a copied link opens the identical map without generating", async ({ page, context, isMobile }) => {
  await page.goto("./");
  await waitForMap(page);
  await page.click("#tab-knights");
  await waitForMap(page);
  await page.uncheck("#no-212-adjacent");
  await page.click(".btn-generate");
  await waitForMap(page);

  await page.click("#btn-share");
  const [link] = await page.evaluate(() => window.__shared);
  expect(link).toBe(page.url());
  if (!isMobile) await expect(page.locator("#toast")).toHaveText(/Link copied/);

  const original = await page.locator("#map-svg").innerHTML();
  const other = await context.newPage();
  await other.goto(link);
  await expect(other.locator("#info-bar")).toContainText("shared link");
  await expect(other.locator("#tab-knights")).toHaveClass(/active/);
  await expect(other.locator("#no-212-adjacent")).not.toBeChecked();
  await expect(other.locator("#no-68-adjacent")).toBeChecked();
  expect(await other.locator("#map-svg").innerHTML()).toBe(original);
  expect(other.url()).toBe(link);
});

test("a broken link is ignored and a fresh map is generated", async ({ page }) => {
  await page.goto("./#not-a-map");
  await waitForMap(page);
  await expect(landTiles(page)).toHaveCount(19);
  const hash = await page.evaluate(() => location.hash.slice(1));
  expect(hash).toMatch(/^[A-Za-z0-9_-]{28}$/);
});

test("intersection strength overlay toggles and stays clear of the tokens", async ({ page }) => {
  await page.goto("./");
  await waitForMap(page);
  const overlay = page.locator(".strength-overlay");
  await expect(overlay).toHaveCount(0);
  await expect(page.locator(".legend-strength")).toBeHidden();

  await page.check("#show-strength");
  await expect(overlay).toHaveCount(1);
  await expect(page.locator(".legend-strength")).toBeVisible();
  const discs = await overlay.locator("circle").count();
  expect(discs).toBeGreaterThan(48); // 54 corners, minus any touching only the desert
  expect(discs).toBeLessThanOrEqual(54);

  // no disc overlaps a number token
  const overlaps = await page.evaluate(() => {
    const circles = (sel) =>
      [...document.querySelectorAll(sel)].map((c) => ({
        x: +c.getAttribute("cx"), y: +c.getAttribute("cy"), r: +c.getAttribute("r"),
      }));
    const tokens = circles("#map-svg > g:not(.strength-overlay) circle[stroke]");
    const discs = circles(".strength-overlay circle");
    return discs.filter((d) => tokens.some((t) => Math.hypot(d.x - t.x, d.y - t.y) < d.r + t.r)).length;
  });
  expect(overlaps).toBe(0);

  await page.uncheck("#show-strength");
  await expect(overlay).toHaveCount(0);
});

test("PNG export downloads a 2× image of the map", async ({ page }) => {
  await page.goto("./");
  await waitForMap(page);
  await page.check("#show-strength");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#btn-png")]);
  expect(download.suggestedFilename()).toBe("catan-standard-map.png");
  const png = readFileSync(await download.path());
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  const [, , vw, vh] = (await page.locator("#map-svg").getAttribute("viewBox")).split(" ").map(Number);
  expect(png.readUInt32BE(16)).toBe(vw * 2);
  expect(png.readUInt32BE(20)).toBe(vh * 2);
});

test("layout fits the screen without sideways scrolling", async ({ page, isMobile }) => {
  await page.goto("./");
  await waitForMap(page);
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
  const svg = await page.locator("#map-svg").boundingBox();
  expect(svg.width).toBeLessThanOrEqual(client);
  for (const sel of [".btn-generate", "#btn-share", "#btn-png"]) {
    await expect(page.locator(sel)).toBeVisible();
  }
  if (isMobile) {
    // Generate takes the full row, Copy link and PNG share the next one
    const share = await page.locator("#btn-share").boundingBox();
    const png = await page.locator("#btn-png").boundingBox();
    const gen = await page.locator(".btn-generate").boundingBox();
    expect(Math.abs(share.y - png.y)).toBeLessThan(2);
    expect(share.y).toBeGreaterThan(gen.y + gen.height - 1);
  }
});
