import { renderShell, loadJSON, cachedFetchJSON, el, icon, linkAttrs, reveal, showError, t, L, lang, runPage, pageSignal, isRerender } from "./core.js";
import { loadPostIndex, postsFor } from "./posts.js";
import { makeProjection, animateViewBox, unionBoxes, bboxOf, svgEl } from "./map.js";

const WORLD_COUNTRIES = 195;
const flagURL = (id) => `https://flagcdn.com/${id.toLowerCase()}.svg`;
export const photoURL = (c, n) => `${c.photos.base}/img${n}.jpg`;

/* =========================================================
   Country facts, live from Wikidata (free, no API key).
   One SPARQL query returns capital, languages, population and
   currency for all visited countries, already in the page language.
   ========================================================= */
async function loadFacts(codes) {
  const query = `
    SELECT ?code (SAMPLE(?capLabel) AS ?capital)
      (GROUP_CONCAT(DISTINCT ?langLabel; separator=", ") AS ?languages)
      (MAX(?pop) AS ?population) (SAMPLE(?curLabel) AS ?currency)
    WHERE {
      VALUES ?code { ${codes.map((c) => `"${c}"`).join(" ")} }
      ?c wdt:P297 ?code .
      MINUS { ?c wdt:P576 [] }
      OPTIONAL { ?c wdt:P36 ?cap . ?cap rdfs:label ?capLabel . FILTER(LANG(?capLabel) = "${lang}") }
      OPTIONAL { ?c wdt:P37 ?l . ?l rdfs:label ?langLabel . FILTER(LANG(?langLabel) = "${lang}") }
      OPTIONAL { ?c wdt:P1082 ?pop }
      OPTIONAL { ?c wdt:P38 ?cur . ?cur rdfs:label ?curLabel . FILTER(LANG(?curLabel) = "${lang}") }
    } GROUP BY ?code`;
  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const data = await cachedFetchJSON(url, 24 * 60); // keep for a day
  const out = {};
  for (const b of data.results.bindings) {
    const v = (k) => b[k]?.value || "";
    out[v("code")] = { capital: v("capital"), languages: v("languages"), population: v("population"), currency: v("currency") };
  }
  return out;
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Greedy label placement: try right, left, above, below each dot and
 *  keep the first spot that doesn't overlap a label or dot already placed. */
function placeLabels(points, fs) {
  const taken = points.map((p) => ({ x: p.x - fs * 0.35, y: p.y - fs * 0.35, w: fs * 0.7, h: fs * 0.7 }));
  return points.map((p) => {
    const w = p.label.length * fs * 0.56, h = fs, gap = fs * 0.5;
    const options = [
      { x: p.x + gap, y: p.y - h / 2, anchor: "start" },
      { x: p.x - gap - w, y: p.y - h / 2, anchor: "end" },
      { x: p.x - w / 2, y: p.y - gap - h, anchor: "middle" },
      { x: p.x - w / 2, y: p.y + gap, anchor: "middle" },
    ];
    const pick = options.find((o) => !taken.some((r) => overlaps({ ...o, w, h }, r))) || options[0];
    taken.push({ x: pick.x, y: pick.y, w, h });
    const tx = pick.anchor === "start" ? pick.x : pick.anchor === "end" ? pick.x + w : pick.x + w / 2;
    return { tx, ty: pick.y + h * 0.8, anchor: pick.anchor };
  });
}


/** Where a city links to: its photos, else its route, else nothing. */
function cityLink(country, city) {
  const hasPhotos = country.photos && (country.places || []).some((p) => p.city === city.id);
  if (hasPhotos) return { href: `/pages/memories.html?c=${country.id}&city=${city.id}` };
  if (city.route) return linkAttrs(city.route);
  return null;
}

/* ---------- Country card ---------- */
function countryCard(c, isHome, actions, stories = 0) {
  const fmt = new Intl.NumberFormat(lang);
  const facts = el("dl", {});
  const setFacts = (f) => {
    const rows = [
      [t("world.capital"), f?.capital],
      [t("world.language"), f?.languages],
      [t("world.population"), f?.population && fmt.format(Number(f.population))],
      [t("world.currency"), f?.currency],
      [t("world.photos"), c.photos && String(c.photos.count)],
    ].filter(([, v]) => v);
    facts.replaceChildren(...rows.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, v)]));
  };
  setFacts(null);

  const multi = (c.cities || []).length > 1;
  const card = el("article", { class: "card country-card", id: `country-${c.id}`, tabindex: "0" },
    c.photos
      ? el("div", { class: "cover" }, el("img", { class: "cover-photo", src: photoURL(c, 1), alt: "", loading: "lazy" }))
      : el("div", { class: "cover cover--empty" }),
    el("div", { class: "body" },
      el("img", { class: "flag-bg", src: flagURL(c.id), alt: "", loading: "lazy" }),
      el("h3", {},
        el("img", { class: "mini-flag", src: flagURL(c.id), alt: t("world.flag", { name: L(c.name) }), loading: "lazy" }),
        L(c.name), isHome ? " 🏠" : ""),
      c.note && el("p", {}, L(c.note)),
      facts,
      multi && el("div", { class: "city-chips" }, c.cities.map((city) => el("span", { class: "chip" }, L(city.name)))),
      el("div", { class: "row" },
        multi && el("button", { class: "btn btn--primary", type: "button", onclick: (e) => { e.stopPropagation(); actions.focus(c.id); } },
          icon("fa-solid fa-map-location-dot"), t("world.cityMap")),
        c.photos && el("a", { class: multi ? "btn" : "btn btn--primary", href: `/pages/memories.html?c=${c.id}` }, icon("fa-solid fa-images"), t("world.memories")),
        c.route && el("a", { class: "btn", ...linkAttrs(c.route) }, icon("fa-solid fa-route"), t("world.route")),
        stories > 0 && el("a", { class: "btn", href: `/pages/blog.html?c=${c.id}` }, icon("fa-solid fa-feather"), t("world.stories", { n: stories })),
        !c.photos && !c.route && !multi && !stories && el("span", { class: "chip" }, t("world.soon"))
      )
    )
  );
  card.setFacts = setFacts;
  card.addEventListener("click", (e) => { if (!e.target.closest("a, button")) actions.open(c.id, false); });
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === card) actions.open(c.id, false); });
  return card;
}

async function main() {
  const mapBox = document.getElementById("map");
  const grid = document.getElementById("countries");
  try {
    await renderShell();
    const [data, svgText] = await Promise.all([
      loadJSON("/data/countries.json"),
      fetch("/assets/src/world.svg").then((r) => r.text()),
    ]);
    const visited = new Map(data.countries.map((c) => [c.id, c]));

    /* ---------- Stats ---------- */
    const photos = data.countries.reduce((sum, c) => sum + (c.photos?.count || 0), 0);
    const cityTotal = data.countries.reduce((sum, c) => sum + (c.cities?.length || 0), 0);
    const stat = (n, label) => el("div", { class: "card stat" }, el("div", { class: "big" }, n), el("p", {}, label));
    document.getElementById("stats").replaceChildren(
      stat(data.countries.length, t("world.statCountries")),
      stat(cityTotal, t("world.statCities")),
      stat(`${Math.round((data.countries.length / WORLD_COUNTRIES) * 100)}%`, t("world.statWorld")),
      stat(photos, t("world.statPhotos"))
    );

    /* ---------- Map ---------- */
    const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
    const W = parseFloat(svg.getAttribute("width")), H = parseFloat(svg.getAttribute("height"));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.removeAttribute("width"); svg.removeAttribute("height");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("world.mapLabel", { n: data.countries.length }));
    mapBox.classList.remove("skeleton");
    mapBox.style.aspectRatio = "";
    mapBox.replaceChildren(svg);
    const project = makeProjection(svg, W, H);
    const cityLayer = svgEl("g", { class: "city-layer" });
    svg.append(cityLayer);

    const tooltip = el("div", { class: "tooltip", hidden: true });
    document.body.append(tooltip);
    const signal = pageSignal();
    signal.addEventListener("abort", () => tooltip.remove());
    const showTip = (e, text) => {
      tooltip.hidden = false;
      tooltip.textContent = text;
      tooltip.style.left = e.clientX + "px";
      tooltip.style.top = e.clientY + "px";
    };
    const hideTip = () => (tooltip.hidden = true);

    const visitedPaths = [];
    for (const path of svg.querySelectorAll("path")) {
      const c = visited.get(path.id);
      const name = L(c?.name) || path.getAttribute("title");
      if (c) {
        path.classList.add("visited");
        if (c.id === data.home) path.classList.add("home");
        path.setAttribute("tabindex", "0");
        path.setAttribute("aria-label", name);
        path.addEventListener("click", () => open(c.id, true));
        path.addEventListener("keydown", (e) => e.key === "Enter" && open(c.id, true));
        visitedPaths.push(path);
      }
      const extra = c?.cities?.length > 1 ? ` · ${t("world.cityCount", { n: c.cities.length })}` : "";
      path.addEventListener("pointermove", (e) => showTip(e, c ? `${name} ✓${extra}` : name));
      path.addEventListener("pointerleave", hideTip);
    }

    const worldBox = [0, 0, W, H];
    const visitedBox = unionBoxes(visitedPaths.map(bboxOf), 0.04);
    document.getElementById("zoom-europe").addEventListener("click", () => { unfocus(); animateViewBox(svg, visitedBox); }, { signal });
    document.getElementById("zoom-world").addEventListener("click", () => { unfocus(); animateViewBox(svg, worldBox); }, { signal });
    animateViewBox(svg, visitedBox, 900);

    /* ---------- Country mode: zoom in and show city dots ---------- */
    const bar = document.getElementById("map-bar");
    const mapCard = document.getElementById("map-card");
    let focused = null;

    function focus(id, scroll = true) {
      const c = visited.get(id);
      const path = svg.querySelector(`[id="${id}"]`);
      if (!c || !path || !(c.cities?.length > 1)) return;
      focused = id;

      const pts = c.cities.map((city) => {
        const [x, y] = project(city.lat, city.lon);
        return { city, x, y, label: L(city.name) };
      });
      // Box = country outline + all cities. Some outlines include far islands,
      // so if the outline is much bigger than the cities, frame the cities instead.
      const countryBox = bboxOf(path);
      const cityBox = unionBoxes(pts.map((p) => [p.x, p.y, 0, 0]), 0, 0);
      const useCities = countryBox[2] > Math.max(cityBox[2], 8) * 6;
      const box = unionBoxes([useCities ? cityBox : countryBox, ...pts.map((p) => [p.x, p.y, 0, 0])], 0.18, 12);

      // Sizes are in map units, so scale them with the zoom level.
      const fs = box[2] * 0.032, r = box[2] * 0.009;
      const labels = placeLabels(pts, fs);
      cityLayer.replaceChildren(...pts.map((p, i) => {
        const link = cityLink(c, p.city);
        const g = svgEl("g", { class: `city ${link ? "has-link" : ""}`, tabindex: "0", role: link ? "link" : "img", "aria-label": p.label });
        g.append(
          svgEl("circle", { cx: p.x, cy: p.y, r: r * 2.2, class: "city-halo" }),
          svgEl("circle", { cx: p.x, cy: p.y, r, class: "city-dot" }),
          svgEl("text", { x: labels[i].tx, y: labels[i].ty, "text-anchor": labels[i].anchor, "font-size": fs, class: "city-label" }, p.label)
        );
        const go = () => {
          if (!link) return;
          if (link.target) window.open(link.href, "_blank", "noopener");
          else location.href = link.href;
        };
        g.addEventListener("click", go);
        g.addEventListener("keydown", (e) => e.key === "Enter" && go());
        g.addEventListener("pointermove", (e) => showTip(e, link ? p.label : t("world.noCityPhotos", { city: p.label })));
        g.addEventListener("pointerleave", hideTip);
        return g;
      }));

      svg.classList.add("focused");
      svg.querySelectorAll(".focus").forEach((n) => n.classList.remove("focus"));
      path.classList.add("focus");
      animateViewBox(svg, box);

      bar.hidden = false;
      document.getElementById("map-title").textContent = `${L(c.name)} · ${t("world.cityCount", { n: c.cities.length })}`;
      document.getElementById("map-cities").replaceChildren(...pts.map((p) => {
        const link = cityLink(c, p.city);
        return link
          ? el("a", { class: "chip", ...link }, icon("fa-solid fa-location-dot"), p.label)
          : el("span", { class: "chip" }, p.label);
      }));
      markSelected(id);
      history.replaceState(null, "", `#${id}`);
      if (scroll) mapCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function unfocus() {
      if (!focused) return;
      focused = null;
      cityLayer.replaceChildren();
      svg.classList.remove("focused");
      svg.querySelectorAll(".focus").forEach((n) => n.classList.remove("focus"));
      bar.hidden = true;
      history.replaceState(null, "", location.pathname + location.search);
    }
    document.getElementById("map-back").addEventListener("click", () => { unfocus(); animateViewBox(svg, visitedBox); }, { signal });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && focused) { unfocus(); animateViewBox(svg, visitedBox); }
    }, { signal });

    /* ---------- Cards ---------- */
    function markSelected(id) {
      svg.querySelectorAll(".selected").forEach((p) => p.classList.remove("selected"));
      grid.querySelectorAll(".selected").forEach((p) => p.classList.remove("selected"));
      svg.querySelector(`[id="${id}"]`)?.classList.add("selected");
      document.getElementById(`country-${id}`)?.classList.add("selected", "in");
    }

    /** Click on a country: several cities -> its city map; otherwise show its card. */
    function open(id, fromMap) {
      const c = visited.get(id);
      if (c?.cities?.length > 1) return focus(id, !fromMap);
      unfocus();
      markSelected(id);
      if (fromMap) document.getElementById(`country-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      history.replaceState(null, "", `#${id}`);
    }

    const sorted = [...data.countries].sort((a, b) => (a.id === data.home ? -1 : b.id === data.home ? 1 : 0));
    const posts = await loadPostIndex().catch(() => []);
    const cards = sorted.map((c) => countryCard(c, c.id === data.home, { open, focus }, postsFor(posts, c.id).length));
    grid.replaceChildren(...cards);
    reveal(cards);

    // Facts arrive a moment later; the cards are already usable.
    loadFacts(data.countries.map((c) => c.id))
      .then((facts) => cards.forEach((card, i) => card.setFacts(facts[sorted[i].id])))
      .catch((err) => console.warn("Wikidata facts unavailable:", err));

    const fromHash = location.hash.slice(1).toUpperCase();
    if (visited.has(fromHash)) open(fromHash, !isRerender());
  } catch (err) {
    showError(mapBox, err);
  }
}

runPage(main);
