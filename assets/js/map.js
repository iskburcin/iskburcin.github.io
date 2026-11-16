// Shared map helpers (My World + Journey pages).
export const SVG_NS = "http://www.w3.org/2000/svg";

/** Load /assets/src/world.svg, give it a viewBox and return { svg, W, H }. */
export async function loadWorldSvg() {
  const text = await fetch("/assets/src/world.svg").then((r) => r.text());
  const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
  const W = parseFloat(svg.getAttribute("width")), H = parseFloat(svg.getAttribute("height"));
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.removeAttribute("width"); svg.removeAttribute("height");
  return { svg, W, H };
}

export function svgEl(tag, attrs = {}, ...children) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of children) {
    if (c == null) continue;
    if (c instanceof Node) n.append(c); else n.textContent = String(c);
  }
  return n;
}

/* =========================================================
   Map projection. The world SVG uses Mercator; its corners are
   stored in mapsvg:geoViewBox="lonLeft latTop lonRight latBottom".
   x is linear in longitude, y is linear in ln(tan(45° + lat/2)).
   ========================================================= */
export function makeProjection(svg, width, height) {
  const [lon0, lat0, lon1, lat1] = svg.getAttribute("mapsvg:geoViewBox").split(/\s+/).map(Number);
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const m0 = merc(lat0), m1 = merc(lat1);
  return (lat, lon) => [((lon - lon0) / (lon1 - lon0)) * width, ((m0 - merc(lat)) / (m0 - m1)) * height];
}

/* ---------- Map zoom: animate the SVG viewBox ---------- */
let running = 0;
export function animateViewBox(svg, to, ms = 700) {
  const from = svg.getAttribute("viewBox").split(" ").map(Number);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 0;
  const start = performance.now(), id = ++running;
  const ease = (x) => 1 - Math.pow(1 - x, 3); // easeOutCubic
  function frame(now) {
    if (id !== running) return; // a newer zoom started
    const p = ms ? Math.min(1, (now - start) / ms) : 1;
    svg.setAttribute("viewBox", from.map((f, i) => f + (to[i] - f) * ease(p)).join(" "));
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** Union of boxes [x, y, w, h], padded by a fraction of their size. */
export function unionBoxes(boxes, padRatio = 0.1, minSize = 0) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const [x, y, w, h] of boxes) {
    x1 = Math.min(x1, x); y1 = Math.min(y1, y);
    x2 = Math.max(x2, x + w); y2 = Math.max(y2, y + h);
  }
  let w = x2 - x1, h = y2 - y1;
  const pad = Math.max(w, h) * padRatio;
  x1 -= pad; y1 -= pad; w += 2 * pad; h += 2 * pad;
  if (w < minSize) { x1 -= (minSize - w) / 2; w = minSize; }
  if (h < minSize * 0.6) { y1 -= (minSize * 0.6 - h) / 2; h = minSize * 0.6; }
  return [x1, y1, w, h];
}
export const bboxOf = (node) => { const b = node.getBBox(); return [b.x, b.y, b.width, b.height]; };

