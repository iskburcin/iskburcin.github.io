import { renderShell, loadJSON, el, icon, reveal, showError, t, L, runPage } from "./core.js";
import { loadAllPosts, assetURL, formatDate, langNote } from "./posts.js";

const flagURL = (id) => `https://flagcdn.com/${id.toLowerCase()}.svg`;
const params = new URLSearchParams(location.search);
const state = { country: (params.get("c") || "all").toUpperCase() };

/** Keep ?c=PL in the URL so a filtered list can be shared (and keep ?drafts). */
function syncURL() {
  const p = new URLSearchParams(location.search);
  if (state.country === "ALL") p.delete("c"); else p.set("c", state.country);
  history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
}

function postCard(post, countries) {
  const country = countries.find((c) => c.id === post.country);
  const city = country?.cities?.find((x) => x.id === post.city);
  const place = [L(city?.name), L(country?.name)].filter(Boolean).join(", ");
  const href = `/pages/post.html?p=${encodeURIComponent(post.slug)}${post.draft ? "&drafts=1" : ""}`;
  const note = langNote(post);
  return el("a", { class: "card post-card", href },
    post.cover && el("div", { class: "post-cover" }, el("img", { src: assetURL(post, post.cover), alt: "", loading: "lazy" })),
    el("div", { class: "post-body" },
      el("div", { class: "post-meta" },
        country && el("img", { class: "mini-flag", src: flagURL(country.id), alt: "" }),
        place && el("span", {}, place),
        el("span", {}, formatDate(post.date)),
        el("span", {}, t("blog.minutes", { n: post.minutes }))
      ),
      el("h2", { lang: post.lang }, post.title),
      post.summary && el("p", { lang: post.lang }, post.summary),
      el("div", { class: "chips" },
        post.draft && el("span", { class: "chip chip--warn" }, t("blog.draft")),
        note && el("span", { class: "chip" }, icon("fa-solid fa-language"), note),
        (post.tags || []).map((tag) => el("span", { class: "chip" }, "#" + tag))
      ),
      el("span", { class: "more" }, t("blog.read"), " →")
    )
  );
}

async function main() {
  const list = document.getElementById("posts");
  const filters = document.getElementById("filters");
  try {
    await renderShell();
    const [posts, { countries }] = await Promise.all([loadAllPosts(), loadJSON("/data/countries.json")]);

    // Filter chips: only countries that have stories
    const used = countries.filter((c) => posts.some((p) => p.country === c.id));
    const chip = (id, label, count, flag) =>
      el("button", { class: "chip", type: "button", "aria-pressed": String(state.country === id),
        onclick: () => { state.country = id; render(); } },
        flag && el("img", { class: "mini-flag", src: flagURL(flag), alt: "" }), `${label} (${count})`);

    function render() {
      filters.replaceChildren(...(used.length > 1 || state.country !== "ALL"
        ? [chip("ALL", t("blog.all"), posts.length), ...used.map((c) => chip(c.id, L(c.name), posts.filter((p) => p.country === c.id).length, c.id))]
        : []));
      const shown = posts.filter((p) => state.country === "ALL" || p.country === state.country);
      const cards = shown.map((p) => postCard(p, countries));
      list.replaceChildren(...(cards.length ? cards
        : [el("p", { class: "empty" }, icon("fa-solid fa-feather"), " ", t(posts.length ? "blog.emptyFilter" : "blog.empty"))]));
      reveal(cards);
      syncURL();
    }
    render();
  } catch (err) {
    showError(list, err);
  }
}

runPage(main);
