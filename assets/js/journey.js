import { renderShell, loadJSON, el, icon, linkAttrs, showError, t, L, lang, runPage, pageSignal } from "./core.js";
import { loadWorldSvg, makeProjection, animateViewBox, unionBoxes, svgEl } from "./map.js";
import { loadPostIndex, loadPost, formatDate } from "./posts.js";

const TYPE_ICON = {
  education: "fa-solid fa-graduation-cap",
  work: "fa-solid fa-briefcase",
  project: "fa-solid fa-code",
  travel: "fa-solid fa-plane",
  milestone: "fa-solid fa-flag",
  community: "fa-solid fa-people-group",
  stories: "fa-solid fa-feather",
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

/** A collapsible chapter: header + summary + body + end line.
 *  Closed: only the header, the summary and the start/end lines show. */
function chapter({ id, title, summary, rangeText, meta, collapsed, typeIcon }, bodyItems, onToggle) {
  const bodyId = `chapter-${id}`;
  const toggleText = el("span", { class: "tl-group-toggle" });
  const head = el("button", { class: "tl-group-head", type: "button", "aria-controls": bodyId },
    el("span", { class: "tl-dot tl-dot--group" }, icon(typeIcon)),
    el("span", { class: "tl-group-titles" },
      el("span", { class: "tl-group-title" }, title),
      el("span", { class: "tl-group-meta" }, rangeText, meta && ` · ${meta}`)),
    toggleText,
    icon("fa-solid fa-chevron-down tl-chevron"));
  const body = el("ol", { class: "tl-group-body", id: bodyId }, bodyItems);
  const node = el("li", { class: "tl-group", dataset: { group: id } },
    head,
    summary && el("p", { class: "tl-group-summary" }, summary),
    body,
    el("div", { class: "tl-group-end" }, el("span", {}, t("journey.chapterEnd"), " · ", rangeText.split(" – ").pop())));
  const set = (closed) => {
    node.classList.toggle("collapsed", closed);
    head.setAttribute("aria-expanded", String(!closed));
    toggleText.textContent = closed ? t("journey.open") : t("journey.close");
  };
  set(collapsed);
  head.addEventListener("click", () => { set(!node.classList.contains("collapsed")); onToggle(); });
  node.head = head;
  return node;
}

/** Blog posts written between e.from and e.to, newest last. */
async function storiesFor(e) {
  const posts = (await loadPostIndex().catch(() => []))
    .filter((p) => p.date >= e.from && p.date <= e.to)
    .sort((a, b) => a.date.localeCompare(b.date));
  return Promise.all(posts.map((p) => loadPost(p).catch(() => ({ ...p, title: p.slug }))));
}

async function main() {
  const list = document.getElementById("timeline");
  const mapBox = document.getElementById("jmap");
  const caption = document.getElementById("jmap-caption");
  try {
    await renderShell();
    const [data, { svg, W, H }] = await Promise.all([loadJSON("/data/timeline.json"), loadWorldSvg()]);
    const { places, groups = {} } = data;
    const project = makeProjection(svg, W, H);

    // "stories" steps list blog posts from their period; drop them while there are none
    const stories = new Map();
    for (const e of data.events.filter((x) => x.type === "stories")) stories.set(e, await storiesFor(e));
    const events = data.events.filter((e) => e.type !== "stories" || stories.get(e).length);

    /* ---------- Timeline list (with chapters) ---------- */
    const items = [];        // one node per step (index = step index)
    const chapters = [];     // { node, first, last }
    const top = [];          // top-level nodes in order
    let lastYear = "";
    let i = 0;
    while (i < events.length) {
      const e = events[i];

      if (e.type === "stories") {
        const posts = stories.get(e);
        const node = chapter({
          id: `stories-${i}`, title: L(e.title), rangeText: range(e), collapsed: true, typeIcon: TYPE_ICON.stories,
          meta: t("journey.stories", { n: posts.length }),
        }, posts.map((p) => el("li", { class: "tl-story" },
          el("a", { class: "card tl-story-card", href: `/pages/post.html?p=${p.slug}` },
            el("span", { class: "tl-story-date" }, formatDate(p.date)),
            el("strong", { lang: p.lang }, p.title),
            p.summary && el("span", { class: "tl-story-sum", lang: p.lang }, p.summary),
            el("span", { class: "tl-story-read" }, t("journey.read"), " →")))), () => pick());
        node.dataset.i = String(i);
        items[i] = node;
        chapters.push({ node, first: i, last: i, stories: true });
        top.push(node);
        lastYear = "";
        i++;
        continue;
      }

      if (e.group && groups[e.group]) {
        const g = groups[e.group];
        const first = i;
        const children = [];
        let gYear = "";
        while (i < events.length && events[i].group === e.group) {
          const y = events[i].date.slice(0, 4);
          children.push(items[i] = eventItem(events[i], i, places, y !== gYear));
          gYear = y;
          i++;
        }
        const last = i - 1;
        const cities = [...new Set(events.slice(first, i).map((x) => L(places[x.place]?.name)?.split(",")[0]).filter(Boolean))];
        const node = chapter({
          id: e.group, title: L(g.title), summary: L(g.summary), collapsed: g.collapsed !== false, typeIcon: "fa-solid fa-book",
          rangeText: `${fmt(events[first].date)} – ${fmt(events[last].end || events[last].date)}`,
          meta: `${cities.join(" → ")} · ${t("journey.steps", { n: i - first })}`,
        }, children, () => pick());
        chapters.push({ node, first, last });
        top.push(node);
        lastYear = "";
        continue;
      }

      const y = e.date.slice(0, 4);
      top.push(items[i] = eventItem(e, i, places, y !== lastYear));
      lastYear = y;
      i++;
    }
    list.replaceChildren(...top);

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
    for (const id of ["TR", "PL"]) svg.querySelector(`[id="${id}"]`)?.classList.add("j-country");

    let active = -1;
    function show(i) {
      if (i === active) return;
      active = i;
      items.forEach((n, k) => n?.classList.toggle("active", k === i));
      chapters.forEach((c) => c.node.head.classList.toggle("active", i >= c.first && i <= c.last));
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

    /* Things the reader can scroll past: visible steps, plus the header of
       each closed chapter (it stands for the chapter's first step). */
    function trackables() {
      const out = [];
      items.forEach((n, k) => { if (n && n.offsetParent !== null && !n.classList.contains("tl-group")) out.push({ node: n, i: k }); });
      for (const c of chapters) if (c.stories || c.node.classList.contains("collapsed")) out.push({ node: c.node, i: c.first });
      return out;
    }

    // Active step = the one whose top passed a "reading line" most recently.
    // On phones the map sits on top, so the line is lower.
    let ticking = false;
    function pick() {
      ticking = false;
      const line = innerHeight * (matchMedia("(max-width: 900px)").matches ? 0.65 : 0.45);
      const tops = trackables().map((x) => ({ ...x, top: x.node.getBoundingClientRect().top }));
      const passed = tops.filter((x) => x.top < line);
      let pickI = passed.length ? passed.reduce((a, b) => (b.top > a.top ? b : a)).i : 0;
      // at the very bottom of the page, the last step wins
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) pickI = events.length - 1;
      show(pickI);
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } };
    addEventListener("scroll", onScroll, { passive: true, signal: pageSignal() });
    addEventListener("resize", onScroll, { signal: pageSignal() });
    items.forEach((n, k) => n && !n.classList.contains("tl-group") &&
      n.addEventListener("click", (ev) => { if (!ev.target.closest("a")) show(k); }));
    show(0);
    pick();
  } catch (err) {
    showError(list, err);
  }
}

runPage(main);
