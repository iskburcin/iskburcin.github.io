import { renderShell, loadJSON, cachedFetchJSON, el, icon, linkAttrs, reveal, showError, timeIn, t as tr, L, runPage, pageInterval } from "./core.js";
import { loadPostIndex, loadPost, assetURL, formatDate } from "./posts.js";

// GitHub's language colors for the repo list (only common ones).
const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Dart: "#00B4AB", Java: "#b07219",
  HTML: "#e34c26", CSS: "#663399", "C#": "#178600", C: "#555555", "C++": "#f34b7d", "Jupyter Notebook": "#DA5B0B",
};

/* A tile is either a link (<a>) or a plain box (<div>). */
function tileBase(t, extraClass, href) {
  const cls = `tile tile--${t.size || "s"} ${extraClass}`;
  return href ? el("a", { class: cls, ...linkAttrs(href) }) : el("div", { class: cls });
}
const arrow = () => icon("fa-solid fa-arrow-up-right tile-arrow");

/* ---------- One function per tile type (a "registry") ----------
   To add a new kind of box, add a function here and use its name as "type" in home.json. */
const renderers = {
  // Big photo on the left, text on the right (stacked on phones)
  profile(t, { site }) {
    return el("div", { class: `tile tile--${t.size || "l"} tile--profile` },
      el("div", { class: "profile-photo" }, el("img", { class: "avatar", src: site.avatar, alt: site.name, loading: "eager" })),
      el("div", { class: "profile-text" },
        el("p", { class: "hello" }, tr("home.hello")),
        el("h2", {}, site.name),
        el("p", { class: "role" }, L(site.role)),
        el("p", { class: "tagline" }, L(site.tagline)),
        t.facts && el("ul", { class: "facts" }, t.facts.map((f) => el("li", {}, icon(f.icon), " ", L(f.text)))),
        site.contact?.availability &&
          el("p", { class: "status" }, el("span", { class: "dot" }), L(site.contact.availability)),
        t.buttons && el("div", { class: "profile-actions" }, t.buttons.map((b) => {
          const isCV = b.href === "cv";
          const href = isCV ? L(site.cv) : b.href;
          return el("a", { class: `btn ${b.primary ? "btn--primary" : ""}`, ...linkAttrs(href), ...(isCV ? { target: "_blank", rel: "noopener" } : {}) },
            icon(b.icon), L(b.label));
        }))
      )
    );
  },

  social(t, { site }) {
    const s = site.socials.find((x) => x.id === t.social);
    if (!s) return null;
    const node = tileBase(t, "tile--social", s.url);
    node.append(
      s.simpleIcon
        ? el("span", { class: "tile-icon tile-icon--brand" }, el("img", { src: `https://cdn.simpleicons.org/${s.simpleIcon}`, alt: "" }))
        : el("span", { class: "tile-icon", style: { background: s.color } }, icon(s.icon)),
      el("span", { class: "tile-title" }, L(s.label)),
      el("span", { class: "tile-sub" }, L(s.handle)),
      arrow()
    );
    return node;
  },

  photo(t) {
    const node = tileBase(t, "tile--photo", t.href);
    node.append(el("img", { src: t.src, alt: L(t.caption) || "", loading: "lazy" }));
    if (t.caption) node.append(el("span", { class: "caption" }, L(t.caption)));
    return node;
  },

  note(t) {
    const node = tileBase(t, "tile--note", t.href);
    node.append(
      el("span", { class: "tile-title" }, L(t.title)),
      el("p", {}, L(t.text)),
      t.href && el("span", { class: "more" }, (L(t.linkText) || tr("ui.readMore")) + " →")
    );
    return node;
  },

  link(t) {
    const node = tileBase(t, "tile--link", t.href);
    node.append(
      el("span", { class: "tile-icon" }, icon(t.icon || "fa-solid fa-link")),
      el("span", { class: "tile-title" }, L(t.title)),
      el("span", { class: "tile-sub" }, L(t.text)),
      arrow()
    );
    return node;
  },

  cv(t, { site }) {
    const node = tileBase(t, "tile--cv", L(site.cv));
    node.target = "_blank"; node.rel = "noopener";
    node.append(
      el("span", { class: "tile-icon", style: { background: "#c0504d" } }, icon("fa-solid fa-file-pdf")),
      el("span", { class: "tile-title" }, tr("home.cv")),
      el("span", { class: "tile-sub" }, tr("home.cvSub")),
      arrow()
    );
    return node;
  },

  clock(t, { site }) {
    const time = el("span", { class: "big-number" }, timeIn(site.timezone));
    pageInterval(() => (time.textContent = timeIn(site.timezone)), 15_000);
    return el("div", { class: `tile tile--${t.size || "s"} tile--clock` },
      el("span", { class: "tile-sub" }, icon("fa-solid fa-location-dot"), " ", L(site.location)),
      el("span", { class: "tile-foot" }, time),
      el("span", { class: "tile-sub" }, tr("home.localTime"))
    );
  },

  travel(t) {
    const count = el("span", { class: "big-number" }, "–");
    loadJSON("/data/countries.json").then((d) => (count.textContent = d.countries.length));
    const node = tileBase(t, "tile--travel", "/pages/world.html");
    node.append(
      el("span", { class: "tile-icon", style: { background: "#2e8b57" } }, icon("fa-solid fa-earth-europe")),
      el("span", { class: "tile-foot" }, count),
      el("span", { class: "tile-sub" }, tr("home.countries")),
      arrow()
    );
    return node;
  },

  tech(t) {
    const count = el("span", { class: "big-number" }, "–");
    loadJSON("/data/snippets.json").then((d) => (count.textContent = d.snippets.length));
    const node = tileBase(t, "tile--tech", "/pages/tech.html");
    node.append(
      el("span", { class: "tile-icon", style: { background: "#3572A5" } }, icon("fa-solid fa-code")),
      el("span", { class: "tile-foot" }, count),
      el("span", { class: "tile-sub" }, tr("home.snippets")),
      arrow()
    );
    return node;
  },

  // A grid of small icons for every social with "group": "coding"
  profiles(t, { site }) {
    const list = site.socials.filter((s) => s.group === (t.group || "coding"));
    return el("div", { class: `tile tile--${t.size || "w"} tile--profiles` },
      el("span", { class: "tile-title" }, L(t.title) || tr("home.profiles")),
      t.subtitle && el("span", { class: "tile-sub" }, L(t.subtitle)),
      el("div", { class: "profile-grid" }, list.map((s) =>
        el("a", { class: "profile-link", ...linkAttrs(s.url), title: `${L(s.label)} · ${L(s.handle)}` },
          el("span", { class: "profile-ico" },
            s.simpleIcon
              ? el("img", { src: `https://cdn.simpleicons.org/${s.simpleIcon}`, alt: "", loading: "lazy" })
              : icon(s.icon)),
          el("span", { class: "profile-name" }, L(s.label))
        )))
    );
  },

  blog(t) {
    const node = tileBase(t, "tile--blog", "/pages/blog.html");
    const title = el("span", { class: "tile-title" }, tr("home.loading"));
    const sub = el("span", { class: "tile-sub" });
    const img = el("img", { class: "blog-bg", alt: "", loading: "lazy", hidden: true });
    node.append(img,
      el("span", { class: "tile-icon", style: { background: "#c26a3d" } }, icon("fa-solid fa-feather")),
      el("span", { class: "tile-sub" }, tr("home.blog")), title, sub, arrow());
    loadPostIndex().then(async (posts) => {
      if (!posts.length) { title.textContent = tr("home.noPosts"); return; }
      const p = await loadPost(posts[0]);
      node.href = `/pages/post.html?p=${p.slug}`;
      title.textContent = p.title;
      sub.textContent = `${formatDate(p.date)} · ${tr("blog.minutes", { n: p.minutes })}`;
      if (p.cover) { img.src = assetURL(p, p.cover); img.hidden = false; node.classList.add("has-cover"); }
    }).catch(() => (title.textContent = tr("home.noPosts")));
    return node;
  },

  github(t, { site }) {
    const user = site.githubUser;
    const stats = el("div", { class: "gh-stats" }, tr("home.loading"));
    const list = el("ul", { class: "repo-list" });
    const node = el("div", { class: `tile tile--${t.size || "w"} tile--github` },
      el("div", { class: "gh-head" },
        el("span", { class: "tile-icon", style: { background: "#24292f" } }, icon("fa-brands fa-github")),
        el("div", {},
          el("a", { class: "tile-title", ...linkAttrs(`https://github.com/${user}`) }, tr("home.github")),
          stats)
      ),
      list
    );

    // Live data from the public GitHub REST API (no key needed).
    Promise.all([
      cachedFetchJSON(`https://api.github.com/users/${user}`),
      cachedFetchJSON(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=30`),
    ]).then(([profile, repos]) => {
      stats.replaceChildren(
        el("span", {}, icon("fa-solid fa-book-bookmark"), " " + tr("home.repos", { n: profile.public_repos })),
        el("span", {}, icon("fa-solid fa-user-group"), " " + tr("home.followers", { n: profile.followers }))
      );
      const own = repos.filter((r) => !r.fork && r.name !== `${user}.github.io`).slice(0, t.repos || 3);
      list.replaceChildren(...own.map((r) =>
        el("li", {}, el("a", linkAttrs(r.html_url),
          icon("fa-regular fa-folder"),
          el("span", { class: "repo-name" }, r.name),
          r.language && el("span", { class: "repo-lang" },
            el("span", { class: "lang-dot", style: { background: LANG_COLORS[r.language] || "#999" } }), r.language)
        ))
      ));
    }).catch(() => {
      stats.textContent = "";
      list.replaceChildren(el("li", {}, el("a", linkAttrs(`https://github.com/${user}`), tr("home.seeRepos"))));
    });
    return node;
  },
};

async function main() {
  const bento = document.getElementById("bento");
  try {
    const site = await renderShell();
    const { tiles } = await loadJSON("/data/home.json");
    const nodes = tiles
      .map((t) => {
        const render = renderers[t.type];
        if (!render) { console.warn("Unknown tile type:", t.type); return null; }
        return render(t, { site });
      })
      .filter(Boolean);
    bento.replaceChildren(...nodes);
    reveal(nodes);
  } catch (err) {
    showError(bento, err);
  }
}

runPage(main);
