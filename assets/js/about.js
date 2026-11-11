import { renderShell, loadJSON, el, icon, linkAttrs, reveal, showError, t, L, runPage } from "./core.js";

async function main() {
  const root = document.getElementById("about");
  try {
    const site = await renderShell();
    const data = await loadJSON("/data/about.json");

    const hero = el("section", { class: "page-head" },
      el("h1", {}, L(data.hero.title)),
      el("p", {}, L(data.hero.intro))
    );

    const sections = data.sections.map((s) => {
      if (s.cards) {
        return el("section", { class: "about-block", id: s.id },
          el("h2", {}, L(s.title)),
          el("div", { class: "card-grid" }, s.cards.map((c) =>
            el("a", { class: "card link-card", ...linkAttrs(c.href) },
              el("span", { class: "card-icon" }, icon(c.icon)),
              el("h3", {}, L(c.title)),
              el("p", {}, L(c.text))
            )
          ))
        );
      }
      return el("section", { class: `about-block card ${s.image ? "with-image" : ""}`, id: s.id },
        s.image && el("img", { src: s.image, alt: site.name, class: "about-img", loading: "lazy" }),
        el("div", {}, el("h2", {}, L(s.title)), s.paragraphs.map((p) => el("p", {}, L(p))),
          s.link && el("p", {}, el("a", { class: "btn", ...linkAttrs(s.link.href) }, L(s.link.label))))
      );
    });

    const projects = el("section", { class: "about-block", id: "projects" },
      el("h2", {}, t("about.projects")),
      el("div", { class: "card-grid" }, data.projects.map((p) =>
        el("article", { class: "card project-card" },
          el("h3", {}, L(p.title), p.status && el("span", { class: "chip chip--warn" }, L(p.status))),
          el("p", {}, L(p.text)),
          p.tags?.length > 0 && el("div", { class: "chips" }, p.tags.map((tag) => el("span", { class: "chip" }, L(tag)))),
          p.links && el("div", { class: "row project-links" }, p.links.map((l) =>
            el("a", { class: "chip chip--link", ...linkAttrs(l.href) },
              icon(/github\.com/.test(l.href) ? "fa-brands fa-github" : "fa-solid fa-arrow-up-right-from-square"), " ", L(l.label))))
        )
      ))
    );

    const skills = el("section", { class: "about-block", id: "skills" },
      el("h2", {}, t("about.skills")),
      el("div", { class: "card-grid" }, data.skills.map((g) =>
        el("div", { class: "card" },
          el("h3", {}, L(g.group)),
          el("div", { class: "chips" }, g.items.map((i) => el("span", { class: "chip" }, L(i))))
        )
      ))
    );

    const future = el("section", { class: "about-block card cta" },
      el("h2", {}, t("about.next")),
      el("p", {}, L(data.future)),
      el("div", { class: "row" },
        el("a", { class: "btn btn--primary", ...linkAttrs(L(site.cv)), target: "_blank", rel: "noopener" }, icon("fa-solid fa-file-pdf"), t("about.cv")),
        el("a", { class: "btn", href: "/pages/contact.html" }, icon("fa-solid fa-envelope"), t("about.contact"))
      )
    );

    root.replaceChildren(hero, ...sections, projects, skills, future);
    reveal(root.querySelectorAll(".about-block, .card-grid > *"));
  } catch (err) {
    showError(root, err);
  }
}

runPage(main);
