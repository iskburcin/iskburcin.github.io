import { renderShell, loadJSON, el, icon, linkAttrs, reveal, showError, t, L, runPage, pageSignal } from "./core.js";
import { loadPostIndex, postsFor } from "./posts.js";

/** Split photo numbers 1..count into `groups` nearly equal parts.
 *  e.g. 25 photos, 6 places -> sizes 5,4,4,4,4,4 */
function splitEvenly(count, groups) {
  const base = Math.floor(count / groups), extra = count % groups;
  const out = [];
  let n = 1;
  for (let g = 0; g < groups; g++) {
    const size = base + (g < extra ? 1 : 0);
    out.push(Array.from({ length: size }, () => n++));
  }
  return out;
}

function setupLightbox(urls) {
  const dlg = document.getElementById("lightbox");
  const img = dlg.querySelector("img");
  const counter = dlg.querySelector(".lb-count");
  let i = 0;
  const show = (k) => {
    i = (k + urls.length) % urls.length; // wrap around
    img.src = urls[i];
    counter.textContent = `${i + 1} / ${urls.length}`;
    new Image().src = urls[(i + 1) % urls.length]; // preload next
  };
  dlg.querySelector(".lb-close").onclick = () => dlg.close();
  dlg.querySelector(".lb-prev").onclick = () => show(i - 1);
  dlg.querySelector(".lb-next").onclick = () => show(i + 1);
  const signal = pageSignal();
  dlg.addEventListener("click", (e) => { if (e.target.classList.contains("stage")) dlg.close(); }, { signal });
  document.addEventListener("keydown", (e) => {
    if (!dlg.open) return;
    if (e.key === "ArrowRight") show(i + 1);
    if (e.key === "ArrowLeft") show(i - 1);
  }, { signal });
  // swipe on phones
  let x0 = null;
  dlg.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true, signal });
  dlg.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  }, { signal });
  return (k) => { show(k); dlg.showModal(); };
}

async function main() {
  const root = document.getElementById("memories");
  try {
    await renderShell();
    const data = await loadJSON("/data/countries.json");
    const id = (new URLSearchParams(location.search).get("c") || "").toUpperCase();
    const c = data.countries.find((x) => x.id === id);

    if (!c || !c.photos) {
      root.replaceChildren(el("section", { class: "page-head" },
        el("h1", {}, t("mem.none")),
        el("p", {}, t("mem.pick")),
        el("div", { class: "row" }, el("a", { class: "btn btn--primary", href: "/pages/world.html" }, icon("fa-solid fa-earth-europe"), t("mem.back")))
      ));
      return;
    }
    const cities = new Map((c.cities || []).map((city) => [city.id, city]));
    const places = c.places?.length ? c.places : [{}];
    // A place is { city, name? }; old data may still be a plain string or { en, tr }.
    const placeName = (p) =>
      p.name ? L(p.name) : p.city ? L(cities.get(p.city)?.name) : typeof p === "string" || p.en ? L(p) : t("world.photos");
    const groups = splitEvenly(c.photos.count, places.length); // photo numbers per place

    // ?city=krakow shows only that city's photos
    const cityId = new URLSearchParams(location.search).get("city");
    const city = cityId && places.some((p) => p.city === cityId) ? cities.get(cityId) : null;
    const shown = places.map((p, i) => ({ p, i })).filter(({ p }) => !city || p.city === city.id);
    const shownCount = shown.reduce((n, { i }) => n + groups[i].length, 0);

    const title = city ? t("mem.cityTitle", { city: L(city.name), country: L(c.name) }) : t("mem.title", { name: L(c.name) });
    document.title = `${title} · Burçin Işık`;
    const route = city?.route || c.route;

    // switch between cities (only cities that have photos)
    const photoCities = [...new Set(places.map((p) => p.city).filter(Boolean))].map((id) => cities.get(id)).filter(Boolean);
    const switcher = photoCities.length > 1 && el("div", { class: "row city-switch" },
      el("a", { class: "chip", href: `?c=${c.id}`, "aria-current": city ? null : "page" }, t("mem.allOf", { name: L(c.name) })),
      photoCities.map((x) =>
        el("a", { class: "chip", href: `?c=${c.id}&city=${x.id}`, "aria-current": city?.id === x.id ? "page" : null },
          icon("fa-solid fa-location-dot"), L(x.name)))
    );

    // stories about this city (or this country when no city is chosen)
    const stories = postsFor(await loadPostIndex().catch(() => []), c.id, city?.id);
    const urls = [];
    const open = setupLightbox(urls);

    const head = el("section", { class: "page-head" },
      el("p", {}, el("a", { href: `/pages/world.html#${c.id}` }, t("mem.backShort"))),
      el("h1", {}, title),
      !city && c.note && el("p", {}, L(c.note)),
      el("div", { class: "row" },
        el("span", { class: "chip" }, icon("fa-solid fa-images"), t("mem.photos", { n: shownCount })),
        el("span", { class: "chip" }, icon("fa-solid fa-location-dot"), t("mem.places", { n: new Set(shown.map(({ p }) => placeName(p))).size })),
        route && el("a", { class: "btn", ...linkAttrs(route) }, icon("fa-solid fa-route"), t("mem.route")),
        stories.length > 0 && el("a", { class: "btn", href: stories.length === 1 ? `/pages/post.html?p=${stories[0].slug}` : `/pages/blog.html?c=${c.id}` },
          icon("fa-solid fa-feather"), t("mem.stories"))
      ),
      switcher
    );

    const sections = shown.map(({ p, i }, k) => {
      const name = placeName(p);
      const cityName = p.city && p.name && photoCities.length > 1 && !city ? L(cities.get(p.city)?.name) : "";
      return el("section", { class: "place" },
        el("h2", {}, el("span", { class: "num" }, String(k + 1).padStart(2, "0")), name,
          cityName && el("span", { class: "place-city" }, cityName)),
        el("div", { class: "photos" }, groups[i].map((n) => {
          const idx = urls.push(`${c.photos.base}/img${n}.jpg`) - 1;
          return el("button", { type: "button", "aria-label": t("mem.open", { n, place: name }), onclick: () => open(idx) },
            el("img", { src: urls[idx], alt: `${name}, ${L(c.name)}`, loading: "lazy" }));
        }))
      );
    });

    root.replaceChildren(head, ...sections);
    reveal(sections);
  } catch (err) {
    showError(root, err);
  }
}

runPage(main);
