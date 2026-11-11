import { renderShell, loadJSON, el, icon, linkAttrs, showError, t, L, lang, runPage, pageSignal } from "./core.js";
import { loadWorldSvg, makeProjection, animateViewBox, unionBoxes, svgEl } from "./map.js";

const TYPE_ICON = {
  education: "fa-solid fa-graduation-cap",
  work: "fa-solid fa-briefcase",
  project: "fa-solid fa-code",
  travel: "fa-solid fa-plane",
  milestone: "fa-solid fa-flag",
  community: "fa-solid fa-people-group",
};

/** "2024-09" -> "Sep 2024" (in the page language); "2016" -> "2016". */
function fmt(d) {
  if (!d) return "";
  const [y, m] = d.split("-").map(Number);
  if (!m) return String(y);
  return new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" }).format(new Date(y, m - 1, 1));
}
const range = (e) => (e.end ? `${fmt(e.date)} – ${fmt(e.end)}` : e.now || e.ongoing ? `${fmt(e.date)} – ${t("journey.present")}` : fmt(e.date));

function eventItem(e, i, places, showYear) {
  const place = places[e.place];
  return el("li", { class: `tl-item type-${e.type} ${e.now ? "is-now" : ""}`, dataset: { i: String(i) } },
    showYear && el("div", { class: "tl-year" }, e.date.slice(0, 4)),
    el("span", { class: "tl-dot" }, icon(TYPE_ICON[e.type] || "fa-solid fa-circle")),
    el("article", { class: "card tl-card" },
      el("div", { class: "tl-meta" },
        el("span", { class: "tl-type" }, t(`type.${e.type}`)),
        el("span", {}, range(e)),
        place && el("span", {}, icon("fa-solid fa-location-dot"), " ", L(place.name)),
        e.now && el("span", { class: "tl-now" }, t("journey.now"))
      ),
      el("h2", {}, L(e.title)),
      el("p", {}, L(e.text)),
      (e.stops || e.links) && el("div", { class: "chips" },
        (e.stops || []).map((s) => el("span", { class: "chip" }, icon("fa-solid fa-location-dot"), L(places[s]?.name))),
        (e.links || []).map((l) => el("a", { class: "chip chip--link", ...linkAttrs(l.href) }, L(l.label), " ↗"))
      )
    )
  );
}

async function main() {
  const list = document.getElementById("timeline");
  const mapBox = document.getElementById("jmap");
  const caption = document.getElementById("jmap-caption");
  try {
    await renderShell();
    const [data, { svg, W, H }] = await Promise.all([loadJSON("/data/timeline.json"), loadWorldSvg()]);
    const { places, events } = data;
    const project = makeProjection(svg, W, H);

    /* ---------- Timeline list ---------- */
    let lastYear = "";
    const items = events.map((e, i) => {
      const year = e.date.slice(0, 4);
      const item = eventItem(e, i, places, year !== lastYear);
      lastYear = year;
      return item;
    });
    list.replaceChildren(...items);

    /* ---------- Map: where was I at each step? ----------
       "Remote" steps stay at the previous city. */
    const pt = (id) => { const p = places[id]; const [x, y] = project(p.lat, p.lon); return { id, x, y, name: L(p.name) }; };
    let current = null;
    const stepPlace = events.map((e) => (places[e.place]?.same ? current : (current = e.place)));

    // Route = the places in order, without repeating the same city twice in a row
    const route = [];
    const routeIndex = stepPlace.map((id) => {
      if (route[route.length - 1]?.id !== id) route.push(pt(id));
      return route.length - 1;
    });

    mapBox.replaceChildren(svg);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("journey.mapLabel"));
    const ptsAttr = (arr) => arr.map((p) => `${p.x},${p.y}`).join(" ");
    const full = svgEl("polyline", { class: "j-route", points: ptsAttr(route) });
    const done = svgEl("polyline", { class: "j-route-done", points: "" });
    const markers = svgEl("g");
    const uniq = [...new Map(route.map((p) => [p.id, p])).values()];
    const dots = Object.fromEntries(uniq.map((p) => [p.id, svgEl("circle", { class: "j-dot", cx: p.x, cy: p.y, r: 1 })]));
    markers.append(...Object.values(dots));
    const stopLayer = svgEl("g");
    const pulse = svgEl("circle", { class: "j-pulse", r: 1 });
    const me = svgEl("circle", { class: "j-me", r: 1 });
    const label = svgEl("text", { class: "j-label" });
    svg.append(full, done, markers, stopLayer, pulse, me, label);
    // tint the countries of all places
    for (const id of ["TR", "PL"]) svg.querySelector(`[id="${id}"]`)?.classList.add("j-country");

    let active = -1;
    function show(i) {
      if (i === active) return;
      active = i;
      items.forEach((n, k) => n.classList.toggle("active", k === i));
      const r = routeIndex[i];
      const here = route[r], prev = route[Math.max(0, r - 1)];
      const stops = (events[i].stops || []).map(pt);

      // zoom to: this city + the previous one + any side trips
      const box = unionBoxes([here, prev, ...stops].map((p) => [p.x, p.y, 0, 0]), 0.35, 70);
      animateViewBox(svg, box, 800);

      // sizes are in map units, so they follow the zoom
      const s = box[2];
      Object.values(dots).forEach((d) => d.setAttribute("r", s * 0.008));
      me.setAttribute("r", s * 0.016); pulse.setAttribute("r", s * 0.04);
      for (const n of [me, pulse]) { n.setAttribute("cx", here.x); n.setAttribute("cy", here.y); }
      label.setAttribute("x", here.x + s * 0.03);
      label.setAttribute("y", here.y + s * 0.012);
      label.setAttribute("font-size", s * 0.042);
      label.textContent = here.name;
      done.setAttribute("points", ptsAttr(route.slice(0, r + 1)));
      stopLayer.replaceChildren(...stops.map((p) => svgEl("circle", { class: "j-stop", cx: p.x, cy: p.y, r: s * 0.011 })));
      caption.replaceChildren(icon(TYPE_ICON[events[i].type]), " ", range(events[i]), " · ", here.name);
    }

    // Active step = the last one whose top has passed a "reading line".
    // On phones the map sits on top, so the line is lower.
    let ticking = false;
    const pick = () => {
      ticking = false;
      const line = innerHeight * (matchMedia("(max-width: 900px)").matches ? 0.65 : 0.45);
      let i = 0;
      items.forEach((n, k) => { if (n.getBoundingClientRect().top < line) i = k; });
      // at the very bottom of the page, the last step wins
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) i = items.length - 1;
      show(i);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } };
    addEventListener("scroll", onScroll, { passive: true, signal: pageSignal() });
    addEventListener("resize", onScroll, { signal: pageSignal() });
    items.forEach((n, i) => n.addEventListener("click", (ev) => { if (!ev.target.closest("a")) show(i); }));
    show(0);
    pick();
  } catch (err) {
    showError(list, err);
  }
}

runPage(main);
