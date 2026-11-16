// Shared helpers used by every page (ES module).

/* ---------- Data loading ---------- */
const jsonCache = new Map();

/** Load a JSON file once; later calls reuse the same promise. */
export function loadJSON(url) {
  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      // "no-cache" = always ask the server if the file changed (cheap 304 if not),
      // so edits to /data/*.json show up right after a deploy.
      fetch(url, { cache: "no-cache" }).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
        return res.json();
      })
    );
  }
  return jsonCache.get(url);
}

/** Fetch JSON from an API and keep it in sessionStorage for `ttlMin` minutes
 *  (GitHub allows 60 unauthenticated requests per hour per visitor). */
export async function cachedFetchJSON(url, ttlMin = 30) {
  const key = "cache:" + url;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key));
    if (hit && Date.now() - hit.t < ttlMin * 60_000) return hit.data;
  } catch { /* storage blocked or empty: just fetch */ }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const data = await res.json();
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch {}
  return data;
}

export const loadSite = () => loadJSON("/data/site.json");

/* ---------- Languages (i18n) ----------
   UI texts: /data/i18n.json  ->  t("tech.title")
   Content:  any JSON value can be { "en": "...", "tr": "..." }  ->  L(value) */
let strings = {};
let fallbackLang = "en";
export let lang = "en";
export let languages = [];

function pickLanguage(available, def) {
  const ok = (c) => c && available.includes(c);
  const fromURL = new URLSearchParams(location.search).get("lang");
  if (ok(fromURL)) return fromURL;
  const saved = readSavedLang();
  if (ok(saved)) return saved;
  // browser preference, e.g. "tr-TR" -> "tr"
  for (const l of navigator.languages || [navigator.language]) {
    const short = (l || "").slice(0, 2).toLowerCase();
    if (ok(short)) return short;
  }
  return def;
}

/* The choice is saved twice: localStorage, plus a cookie in case storage is blocked. */
function saveLang(code) {
  try { localStorage.setItem("lang", code); } catch {}
  document.cookie = `lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
}
function readSavedLang() {
  try { const v = localStorage.getItem("lang"); if (v) return v; } catch {}
  return document.cookie.match(/(?:^|;\s*)lang=([a-z-]+)/)?.[1] || null;
}

let langChosen = false;
export async function loadI18n() {
  const data = await loadJSON("/data/i18n.json");
  languages = data.languages;
  fallbackLang = data.default || "en";
  strings = data.strings;
  if (!langChosen) {
    lang = pickLanguage(languages.map((l) => l.code), fallbackLang);
    langChosen = true;
    // a ?lang=xx link also becomes the saved choice, so the next page keeps it
    if (new URLSearchParams(location.search).get("lang") === lang) saveLang(lang);
  }
  document.documentElement.lang = lang;
  return lang;
}

/** Translate a UI key; {name} placeholders are filled from vars. */
export function t(key, vars = {}) {
  const s = strings[lang]?.[key] ?? strings[fallbackLang]?.[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

/** Pick the current language from a content value (plain strings pass through). */
export function L(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[lang] ?? value[fallbackLang] ?? Object.values(value)[0];
  }
  return value;
}

/** Translate static HTML: data-i18n="key" (text), data-i18n-attr="placeholder:key;aria-label:key". */
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((n) => (n.textContent = t(n.dataset.i18n)));
  root.querySelectorAll("[data-i18n-attr]").forEach((n) => {
    for (const pair of n.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) n.setAttribute(attr, t(key));
    }
  });
}

/* ---------- Live re-rendering ----------
   Each page starts with runPage(render). Switching language calls
   render() again without reloading. Listeners and timers a page adds
   use pageSignal(), so the old ones are removed before the new render. */
let pageCtl = new AbortController();
let currentRender = null;
let rerendering = false;
export const pageSignal = () => pageCtl.signal;
export const isRerender = () => rerendering;

/** Run a timer that stops automatically on the next re-render. */
export function pageInterval(fn, ms) {
  const id = setInterval(fn, ms);
  pageCtl.signal.addEventListener("abort", () => clearInterval(id));
}

export function runPage(render) {
  currentRender = render;
  return render();
}

async function setLanguage(code) {
  saveLang(code);
  lang = code;
  document.documentElement.lang = code;
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) { url.searchParams.delete("lang"); history.replaceState(null, "", url); }
  if (!currentRender) return location.reload();
  const y = scrollY;
  pageCtl.abort();                 // remove old listeners / timers
  pageCtl = new AbortController();
  rerendering = true;
  try { await currentRender(); } finally { rerendering = false; }
  scrollTo(0, y);                  // stay where the reader was
}

/* ---------- Safe DOM builder ----------
   el("a", { href: "/x", class: "btn" }, "text", childNode)
   Text is always inserted with textContent, never innerHTML,
   so content from JSON/APIs can't inject HTML (XSS). */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const icon = (cls) => el("i", { class: cls, "aria-hidden": "true" });

/** Open external links in a new tab safely. */
export const isExternal = (href = "") => /^https?:\/\//.test(href) && !href.includes(location.host);
export const linkAttrs = (href) =>
  isExternal(href) ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };

/* ---------- Theme (light / dark) ---------- */
function getStoredTheme() {
  try { return localStorage.getItem("theme"); } catch { return null; }
}
function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
function currentTheme() {
  return document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
applyTheme(getStoredTheme());

/* ---------- Header + footer, built from site.json ---------- */
function samePage(href) {
  const norm = (p) => p.replace(/\/index\.html$/, "/");
  return norm(new URL(href, location.origin).pathname) === norm(location.pathname);
}

/* ---------- Visitor counter (GoatCounter, no cookies) ----------
   Set "goatcounter": "<your code>" in site.json to turn it on. */
/* Count each page by its path only ("/pages/post.html", not "...?p=x"),
   and "/index.html" as "/", so the list of pages stays fixed and known. */
const pagePath = (p = location.pathname) => p.replace(/\/index\.html$/, "/") || "/";

function startAnalytics(code) {
  if (!code || document.querySelector("script[data-goatcounter]")) return;
  window.goatcounter = { path: () => pagePath() };
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  document.head.append(s);
}

// Pages that load the counter (nav pages are added from site.json).
const COUNTED_PAGES = ["/", "/pages/memories.html", "/pages/post.html", "/pages/cv.html"];

let visitCount = null;
/** Total visits for the whole site, or null if the counter is off or unreachable.
 *  GoatCounter's own TOTAL is cached for hours on their side, so instead we add up
 *  the per-page counts (always fresh) and +1 for this visit, which GoatCounter
 *  records a few seconds after the page loads. */
export function loadVisitCount(site) {
  if (!site.goatcounter) return Promise.resolve(null);
  if (visitCount) return visitCount; // footer + home box share one lookup
  const pages = [...new Set([...COUNTED_PAGES, ...site.nav.map((n) => pagePath(n.href))])];
  const one = (p) =>
    fetch(`https://${site.goatcounter}.goatcounter.com/counter/${encodeURIComponent(p)}.json`)
      .then((r) => (r.ok ? r.json() : { count: "0" })) // 404 = page not visited yet
      .then((d) => Number(String(d.count).replace(/\D/g, "")) || 0);
  visitCount = Promise.all(pages.map(one))
    .then((counts) => new Intl.NumberFormat(lang).format(counts.reduce((a, b) => a + b, 0) + 1))
    .catch(() => null);
  return visitCount;
}

export async function renderShell() {
  const [site] = await Promise.all([loadSite(), loadI18n()]);
  startAnalytics(site.goatcounter);
  applyI18n();
  document.querySelectorAll(".site-header, .site-footer").forEach((n) => n.remove());

  const nav = el("nav", { class: "nav", id: "site-nav", "aria-label": "Main" },
    site.nav.map((item) =>
      el("a", { href: item.href, "aria-current": samePage(item.href) ? "page" : null }, L(item.label))
    )
  );

  // Language switcher: one small button per language
  const langSwitch = el("div", { class: "lang-switch", role: "group", "aria-label": t("ui.language") },
    languages.map((l) =>
      el("button", {
        type: "button", lang: l.code, title: l.label, "aria-label": l.label,
        "aria-pressed": String(l.code === lang),
        onclick: () => l.code !== lang && setLanguage(l.code),
      }, l.short)
    )
  );

  const themeBtn = el("button", { class: "icon-btn", type: "button", "aria-label": t("ui.theme") });
  const setThemeIcon = () => themeBtn.replaceChildren(icon(currentTheme() === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon"));
  setThemeIcon();
  themeBtn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
    setThemeIcon();
  });

  const menuBtn = el("button", {
    class: "icon-btn menu-btn", type: "button", "aria-label": t("ui.menu"),
    "aria-controls": "site-nav", "aria-expanded": "false",
  }, icon("fa-solid fa-bars"));
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  const header = el("header", { class: "site-header" },
    el("div", { class: "wrap" },
      el("a", { class: "brand", href: "/index.html" }, site.name),
      menuBtn, nav, langSwitch, themeBtn
    )
  );

  const footer = el("footer", { class: "site-footer" },
    el("div", { class: "wrap" },
      el("span", {}, `© ${new Date().getFullYear()} ${site.name}`),
      el("span", {},
        el("a", { href: site.oldVersion }, t("ui.oldVersion")), " · ",
        el("a", linkAttrs(`https://github.com/${site.githubUser}/${site.githubUser}.github.io`), t("ui.source"))
      )
    )
  );
  // "👀 1,234 visits" in the footer, only when the counter is on
  loadVisitCount(site).then((n) => {
    if (n == null) return;
    footer.querySelector(".wrap").append(el("span", { class: "visit-count" }, icon("fa-regular fa-eye"), " ", t("ui.visits", { n })));
  });

  document.body.prepend(header);
  document.body.append(footer);
  return site;
}

/* ---------- Scroll reveal ---------- */
const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
      }
    }, { threshold: 0.12 })
  : null;

/** Fade elements in when they scroll into view. */
export function reveal(nodes) {
  for (const n of nodes) {
    n.classList.add("reveal");
    if (observer && !rerendering) observer.observe(n); else n.classList.add("in");
  }
}

/** Show a friendly error inside a container. */
export function showError(container, err) {
  console.error(err);
  const msg = Object.keys(strings).length ? t("ui.error") : "Sorry, this part couldn't load.";
  container.replaceChildren(el("p", { class: "error-box" }, msg, " ", String(err.message || err)));
}

/** Local time string in a given IANA timezone. */
export function timeIn(tz, opts = {}) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, ...opts }).format(new Date());
}
