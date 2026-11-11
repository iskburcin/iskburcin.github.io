import { renderShell, el, icon, linkAttrs, showError, t, L, runPage, isExternal } from "./core.js";
import { loadPostIndex, loadPost, assetURL, formatDate, placeOf } from "./posts.js";

const flagURL = (id) => `https://flagcdn.com/${id.toLowerCase()}.svg`;

/** Markdown -> safe HTML -> DOM, then small fixes for images and links. */
function renderMarkdown(post) {
  const html = window.marked.parse(post.body, { gfm: true });
  // The text is mine, but cleaning it is still good practice before using innerHTML.
  const clean = window.DOMPurify.sanitize(html);
  const article = el("div", { class: "prose", lang: post.lang });
  article.innerHTML = clean;

  for (const img of article.querySelectorAll("img")) {
    img.src = assetURL(post, img.getAttribute("src")); // "photo1.jpg" -> /posts/<slug>/photo1.jpg
    img.loading = "lazy";
    // A photo alone in its paragraph becomes a figure with its alt text as caption
    const p = img.parentElement;
    if (p.tagName === "P" && p.childNodes.length === 1) {
      const fig = el("figure", {},
        el("a", { href: img.src, target: "_blank", rel: "noopener" }, img.cloneNode()),
        img.alt && el("figcaption", {}, img.alt));
      p.replaceWith(fig);
    }
  }
  for (const a of article.querySelectorAll("a[href]")) {
    if (isExternal(a.href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  }
  return article;
}

async function main() {
  const root = document.getElementById("post");
  try {
    await renderShell();
    const slug = new URLSearchParams(location.search).get("p");
    const all = await loadPostIndex();
    const i = all.findIndex((p) => p.slug === slug);
    if (i === -1) {
      root.replaceChildren(el("section", { class: "page-head" },
        el("h1", {}, t("post.notFound")),
        el("p", {}, el("a", { href: "/pages/blog.html" }, t("post.back")))));
      return;
    }

    const post = await loadPost(all[i]);
    const place = await placeOf(post);
    document.title = `${post.title} · Burçin Işık`;

    const placeName = place && [L(place.city?.name), L(place.country.name)].filter(Boolean).join(", ");
    const head = el("header", { class: "post-head" },
      el("p", {}, el("a", { href: "/pages/blog.html" }, t("post.back"))),
      el("div", { class: "post-meta" },
        place && el("img", { class: "mini-flag", src: flagURL(place.country.id), alt: "" }),
        placeName && el("span", {}, placeName),
        el("time", { datetime: post.date }, formatDate(post.date)),
        el("span", {}, t("blog.minutes", { n: post.minutes }))
      ),
      el("h1", { lang: post.lang }, post.title),
      post.summary && el("p", { class: "post-summary", lang: post.lang }, post.summary),
      post.lang !== document.documentElement.lang &&
        el("p", { class: "lang-note" }, icon("fa-solid fa-language"), " ", t("post.onlyLangNote", { lang: t(`lang.${post.lang}`) }))
    );
    const cover = post.cover && el("img", { class: "post-hero", src: assetURL(post, post.cover), alt: "" });

    // Links back into the map and the photo galleries
    const hasCityPhotos = place?.country.photos && (place.country.places || []).some((p) => p.city === post.city);
    const related = place && el("div", { class: "row related" },
      hasCityPhotos && el("a", { class: "btn btn--primary", href: `/pages/memories.html?c=${place.country.id}&city=${post.city}` },
        icon("fa-solid fa-images"), t("post.photos", { place: L(place.city.name) })),
      !hasCityPhotos && place.country.photos && el("a", { class: "btn btn--primary", href: `/pages/memories.html?c=${place.country.id}` },
        icon("fa-solid fa-images"), t("post.photos", { place: L(place.country.name) })),
      el("a", { class: "btn", href: `/pages/world.html#${place.country.id}` },
        icon("fa-solid fa-map-location-dot"), t("post.onMap", { country: L(place.country.name) })),
      place.city?.route && el("a", { class: "btn", ...linkAttrs(place.city.route) }, icon("fa-solid fa-route"), t("world.route"))
    );

    // Newer / older (the list is sorted newest first)
    const keep = all[i].draft ? "&drafts=1" : "";
    const [newer, older] = await Promise.all([all[i - 1], all[i + 1]].map((p) => p && loadPost(p).catch(() => p)));
    const navLink = (p, label, cls) => p && el("a", { class: `card post-nav-link ${cls}`, href: `/pages/post.html?p=${p.slug}${keep}` },
      el("span", { class: "label" }, label), el("span", { class: "nav-title", lang: p.lang }, p.title || p.slug));
    const nav = el("nav", { class: "post-nav" },
      navLink(newer, t("post.newer"), "newer") || el("span"),
      navLink(older, t("post.older"), "older") || el("span"));

    root.replaceChildren(el("article", {}, head, cover, renderMarkdown(post), related), nav);
  } catch (err) {
    showError(root, err);
  }
}

runPage(main);
