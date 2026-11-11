import { renderShell, loadJSON, el, icon, reveal, showError, t, L, runPage, pageSignal } from "./core.js";

/* State lives in the URL (?cat=python&q=list), so filtered views can be shared as links. */
const params = new URLSearchParams(location.search);
const state = { cat: params.get("cat") || "all", q: params.get("q") || "" };

function syncURL() {
  const p = new URLSearchParams();
  if (state.cat !== "all") p.set("cat", state.cat);
  if (state.q) p.set("q", state.q);
  history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
}

/** Wait until the user stops typing (debounce) before filtering. */
function debounce(fn, ms = 150) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Wrap matches of `q` in <mark> using DOM nodes (safe, no innerHTML). */
function highlightText(text, q) {
  if (!q) return [text];
  const out = [];
  const lower = text.toLowerCase(), needle = q.toLowerCase();
  let i = 0, j;
  while ((j = lower.indexOf(needle, i)) !== -1) {
    out.push(text.slice(i, j), el("mark", {}, text.slice(j, j + q.length)));
    i = j + q.length;
  }
  out.push(text.slice(i));
  return out;
}

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = t("ui.copied");
  } catch {
    btn.textContent = t("ui.copyFallback");
  }
  setTimeout(() => (btn.textContent = t("ui.copy")), 1500);
}

function snippetCard(s, catMap) {
  const codeEl = el("code", { class: `language-${s.lang}` }, s.code);
  if (window.hljs) window.hljs.highlightElement(codeEl);
  const btn = el("button", { class: "copy-btn", type: "button" }, t("ui.copy"));
  btn.addEventListener("click", () => copy(s.code, btn));
  const cat = catMap[s.category];

  const head = el("div", { class: "snippet-head" },
    el("div", { class: "meta" }, cat && icon(cat.icon), L(cat?.label), " · ", s.file.split("/").pop()),
    el("h3", {}),
    el("p", {}),
    el("div", { class: "chips" }, s.tags.map((tag) =>
      el("button", { class: "chip", type: "button", onclick: () => setQuery(tag) }, "#" + tag)))
  );
  const card = el("article", { class: "card snippet" }, head, el("pre", {}, btn, codeEl));
  card.update = (q) => {
    head.querySelector("h3").replaceChildren(...highlightText(L(s.title), q));
    head.querySelector("p").replaceChildren(...highlightText(L(s.description), q));
  };
  return card;
}

let setQuery = () => {};

async function main() {
  const list = document.getElementById("snippets");
  const filters = document.getElementById("filters");
  const count = document.getElementById("count");
  const input = document.getElementById("q");

  try {
    await renderShell();
    const data = await loadJSON("/data/snippets.json");
    const catMap = Object.fromEntries(data.categories.map((c) => [c.id, c]));

    // Load every code file in parallel.
    const snippets = await Promise.all(data.snippets.map(async (s) => {
      const res = await fetch(s.file);
      const code = res.ok ? (await res.text()).trimEnd() : `// could not load ${s.file}`;
      return { ...s, code };
    }));

    const cards = snippets.map((s) => ({ s, node: snippetCard(s, catMap) }));

    // Category buttons with counts
    const cats = [{ id: "all", label: t("tech.all"), icon: "fa-solid fa-layer-group" }, ...data.categories];
    const buttons = cats.map((c) => {
      const n = c.id === "all" ? snippets.length : snippets.filter((s) => s.category === c.id).length;
      return el("button", { class: "chip", type: "button", dataset: { cat: c.id },
        onclick: () => { state.cat = c.id; render(); } }, icon(c.icon), `${L(c.label)} (${n})`);
    });
    filters.replaceChildren(...buttons);

    function render() {
      const q = state.q.trim().toLowerCase();
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
      const visible = cards.filter(({ s }) =>
        (state.cat === "all" || s.category === state.cat) &&
        (!q || [L(s.title), L(s.description), s.tags.join(" "), s.code].join(" ").toLowerCase().includes(q))
      );
      visible.forEach(({ node }) => node.update(state.q.trim()));
      list.replaceChildren(...visible.map((c) => c.node));
      if (!visible.length) list.replaceChildren(el("p", { class: "empty" }, t("tech.empty")));
      count.textContent = t(visible.length === 1 ? "tech.count.one" : "tech.count.other", { n: visible.length });
      syncURL();
    }

    setQuery = (q) => { input.value = q; state.q = q; render(); input.focus(); };
    input.value = state.q;
    const signal = pageSignal();
    input.addEventListener("input", debounce(() => { state.q = input.value; render(); }), { signal });

    // Keyboard shortcut: "/" focuses search, Esc clears it.
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      if (e.key === "Escape" && document.activeElement === input) setQuery("");
    }, { signal });

    render();
    reveal(cards.map((c) => c.node));
  } catch (err) {
    showError(list, err);
  }
}

runPage(main);
