// ─── PNG export ───────────────────────────────────────────────────────────────
// Draws the live SVG map onto a canvas and hands back a PNG. An SVG used as an
// image can't reach the page's fonts, so the two faces the map uses are
// embedded as data URLs; if that fails the text falls back to a system font.

const SVG_NS = "http://www.w3.org/2000/svg";

const MAP_FONTS = [
  { family: "Cinzel", weight: 700, url: "fonts/cinzel-700.woff2" },
  { family: "Oswald", weight: 600, url: "fonts/oswald-600.woff2" },
];

let fontCss = null;

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function embeddedFontCss() {
  if (fontCss !== null) return fontCss;
  const faces = await Promise.all(
    MAP_FONTS.map(async ({ family, weight, url }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return "";
        const b64 = bytesToBase64(await res.arrayBuffer());
        return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
      } catch {
        return "";
      }
    }),
  );
  fontCss = faces.join("");
  return fontCss;
}

export async function svgToPngBlob(svg, { scale = 2, background = "#1a1208" } = {}) {
  const [, , w, h] = svg.getAttribute("viewBox").split(/[\s,]+/).map(Number);
  const width = Math.round(w * scale),
    height = Math.round(h * scale);

  // Rasterise the vector at the final size, not a 1× bitmap stretched up
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  const css = await embeddedFontCss();
  if (css) {
    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([xml], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
