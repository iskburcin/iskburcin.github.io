// CV page: renders /data/cv.json as a printable A4 sheet
// (turquoise sidebar + timeline main column).
import { loadJSON, loadI18n, el, icon, L, lang, showError } from "./core.js";

/** "**bold** text" -> [<strong>bold</strong>, " text"] (no innerHTML). */
function rich(text) {
  return String(text ?? "").split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? el("strong", {}, part) : part));
}

const linkIcon = (href) =>
  /github\.com/.test(href) ? "fa-brands fa-github" : /linkedin/.test(href) ? "fa-brands fa-linkedin" : "fa-solid fa-globe";

async function main() {
  const root = document.getElementById("cv");
  try {
    await loadI18n();
    const cv = await loadJSON("/data/cv.json");
    const h = (key) => L(cv.headings[key]);
    document.title = `${cv.name} · CV`;

    // screen-only toolbar
    const other = lang === "tr" ? "en" : "tr";
    document.getElementById("toolbar").replaceChildren(
      el("a", { class: "tb-btn", href: "/index.html" }, icon("fa-solid fa-arrow-left"), " iskburcin.github.io"),
      el("a", { class: "tb-btn", href: `?lang=${other}` }, icon("fa-solid fa-language"), " ", other.toUpperCase()),
      el("button", { class: "tb-btn tb-primary", type: "button", onclick: () => print() }, icon("fa-solid fa-print"), " Print / PDF")
    );

    /* ---------- Sidebar ---------- */
    const sideSec = (key, ...children) => el("section", { class: "side-sec" }, el("h2", {}, h(key)), ...children);
    const side = el("aside", { class: "cv-side" },
      el("img", { class: "cv-photo", src: cv.photo, alt: cv.name }),
      sideSec("contact",
        el("p", {}, icon("fa-solid fa-envelope"), el("a", { href: `mailto:${cv.email}` }, cv.email)),
        el("p", {}, icon("fa-solid fa-location-dot"), el("span", {}, L(cv.location))),
        cv.links.map((l) => el("p", {}, icon(linkIcon(l.href)), el("a", { href: l.href }, l.text)))
      ),
      sideSec("skills", cv.skills.map((s) => el("div", { class: "skill" },
        el("h3", {}, L(s.group)),
        el("div", { class: "tags" }, s.items.split(/,\s*/).map((i) => el("span", {}, i)))))),
      sideSec("languages", el("ul", {}, cv.languages.map((l) => el("li", {}, L(l))))),
      cv.interests && sideSec("interests", el("div", { class: "tags tags--soft" }, cv.interests.map((i) => el("span", {}, L(i)))))
    );

    /* ---------- Main column ---------- */
    const sec = (key, ...children) => el("section", { class: `main-sec sec-${key}` }, el("h2", {}, el("span", {}, h(key))), ...children);
    const tlItem = (title, sub, date, text) => el("div", { class: "tl" },
      el("div", { class: "tl-head" }, el("h3", {}, title), el("span", { class: "date" }, date)),
      sub && el("p", { class: "sub" }, sub),
      text && el("p", {}, ...rich(text)));

    const main = el("div", { class: "cv-main" },
      el("header", { class: "cv-head" },
        el("h1", {}, cv.name),
        el("p", { class: "cv-title" }, L(cv.title)),
        el("p", { class: "cv-about" }, ...rich(L(cv.about)))
      ),
      sec("experience", el("div", { class: "timeline" }, cv.experience.map((x) => tlItem(L(x.role), L(x.org), L(x.date), L(x.text))))),
      sec("education", el("div", { class: "timeline" }, cv.education.map((e) => tlItem(L(e.school), L(e.degree), L(e.date), L(e.note))))),
      sec("projects", el("div", { class: "projects" }, cv.projects.map((p) => el("div", { class: "project" },
        el("div", { class: "tl-head" }, el("h3", {}, el("a", { href: p.href }, p.name)), el("span", { class: "tech" }, p.tech)),
        el("p", {}, ...rich(L(p.text)))))))
    );

    root.replaceChildren(side, main);
  } catch (err) {
    showError(root, err);
  }
}

main();
