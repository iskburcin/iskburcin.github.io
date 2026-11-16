import { renderShell, loadJSON, el, icon, linkAttrs, reveal, showError, t, L, lang, runPage } from "./core.js";

/* Ekinci capstone project docs: everything comes from /data/ekinci.json. */

const STATUS_ICON = {
  done: "fa-solid fa-circle-check",
  doing: "fa-solid fa-circle-half-stroke",
  todo: "fa-regular fa-circle",
};

/** "23 Oct 2026" / "23 Eki 2026" in the page language. */
const fmtDate = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", opts).format(new Date(`${iso}T12:00:00`));

/** The leaf mark of the Ekinci app (same drawing as the app icon). */
function leafMark() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l7-7");
  svg.append(path);
  return el("span", { class: "ek-logo" }, svg);
}

const sectionHead = (id, title, intro) =>
  el("header", { class: "ek-head" }, el("h2", { id: `${id}-title` }, L(title)), intro && el("p", {}, L(intro)));

function section(id, title, intro, ...children) {
  return el("section", { class: "ek-section", id, "aria-labelledby": `${id}-title` }, sectionHead(id, title, intro), ...children);
}

function hero(data) {
  const h = data.hero;
  return el("section", { class: "ek-hero card" },
    el("p", { class: "ek-eyebrow" }, L(h.eyebrow)),
    el("h1", {}, leafMark(), h.title),
    el("p", { class: "ek-subtitle" }, L(h.subtitle)),
    el("p", { class: "ek-intro" }, L(h.intro)),
    el("div", { class: "chips" }, h.chips.map((c) => el("span", { class: "chip" }, L(c)))),
    el("dl", { class: "ek-stats" }, h.stats.map((s) =>
      el("div", { class: "ek-stat" }, el("dt", {}, s.value), el("dd", {}, L(s.label))))),
    el("div", { class: "row" },
      el("a", { class: "btn btn--primary", href: "#usage" }, icon("fa-solid fa-book-open"), t("ekinci.jumpUsage")),
      el("a", { class: "btn", href: "#roadmap" }, icon("fa-solid fa-list-check"), t("ekinci.jumpRoadmap")),
      el("a", { class: "btn", href: "#log" }, icon("fa-solid fa-calendar-days"), t("ekinci.jumpLog"))),
    el("p", { class: "ek-updated" }, t("ekinci.updated", { date: fmtDate(data.updated) }))
  );
}

const toc = (items) =>
  el("nav", { class: "ek-toc", "aria-label": t("ekinci.toc") },
    items.map((i) => el("a", { class: "chip chip--link", href: `#${i.id}` }, L(i.label))));

const iconCard = (c) =>
  el("article", { class: "card" }, el("span", { class: "card-icon" }, icon(c.icon)), el("h3", {}, L(c.title)), el("p", {}, L(c.text)));

function why(w) {
  return section("why", w.title, w.intro, el("div", { class: "card-grid" }, w.points.map(iconCard)));
}

function purpose(p) {
  return section("purpose", p.title, null,
    el("blockquote", { class: "ek-question card" },
      el("span", { class: "ek-question-label" }, t("ekinci.question")),
      el("p", {}, L(p.question))),
    el("p", { class: "ek-lead" }, L(p.intro)),
    el("h3", { class: "ek-subhead" }, t("ekinci.users")),
    el("div", { class: "card-grid" }, p.users.map(iconCard)));
}

function how(h) {
  const flow = el("ol", { class: "ek-flow", "aria-label": t("ekinci.flow") }, h.flow.map((n) =>
    el("li", { class: "ek-node" }, el("span", { class: "card-icon" }, icon(n.icon)),
      el("strong", {}, L(n.title)), el("span", {}, L(n.text)))));
  return section("how", h.title, h.intro, flow,
    el("div", { class: "card-grid ek-steps" }, h.steps.map(iconCard)),
    el("p", { class: "ek-formula" }, icon("fa-solid fa-square-root-variable"), " ", L(h.formula)));
}

function stack(s) {
  return section("stack", s.title, s.intro, el("div", { class: "card-grid ek-stack" }, s.groups.map((g) =>
    el("article", { class: "card" },
      el("span", { class: "card-icon" }, icon(g.icon)),
      el("h3", {}, L(g.title)),
      el("div", { class: "chips" }, g.items.map((i) => el("span", { class: "chip" }, L(i)))),
      g.note && el("p", { class: "ek-note-small" }, L(g.note))))));
}

/** Accessible tabs: arrow keys move between tabs, only the active panel is shown. */
function usage(u) {
  const tabs = [];
  const panels = [];
  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) tabs[index].focus();
  };
  u.tabs.forEach((tab, i) => {
    tabs.push(el("button", {
      type: "button", role: "tab", id: `tab-${tab.id}`, "aria-controls": `panel-${tab.id}`, class: "ek-tab",
      onclick: () => select(i),
      onkeydown: (e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (step) { e.preventDefault(); select((i + step + u.tabs.length) % u.tabs.length, true); }
      },
    }, icon(tab.icon), " ", L(tab.label)));
    panels.push(el("div", { role: "tabpanel", id: `panel-${tab.id}`, "aria-labelledby": `tab-${tab.id}`, class: "ek-panel card" },
      el("p", { class: "ek-lead" }, L(tab.intro)),
      el("ol", { class: "ek-guide" }, tab.steps.map((s) =>
        el("li", {}, el("h3", {}, L(s.title)), el("p", {}, L(s.text)))))));
  });
  select(0);
  return section("usage", u.title, null, el("div", { class: "ek-tabs", role: "tablist", "aria-label": L(u.title) }, tabs), panels);
}

function progressBar(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return el("div", { class: "ek-progress" },
    el("div", { class: "ek-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": label },
      el("span", { style: { width: `${pct}%` } })),
    el("span", { class: "ek-progress-text" }, t("ekinci.progress", { done, total, pct })));
}

function task(item) {
  const main = el("div", { class: "ek-task-main" },
    el("span", {}, L(item.text)),
    item.date && el("time", { class: "ek-date", datetime: item.date }, icon("fa-solid fa-check"), " ", fmtDate(item.date)),
    item.status === "doing" && el("span", { class: "ek-date ek-date--doing" }, t("ekinci.status.doing")));
  const body = item.detail
    ? el("details", { class: "ek-task-detail" }, el("summary", {}, main), el("p", {}, L(item.detail)))
    : main;
  return el("li", { class: `ek-task ek-task--${item.status}` },
    el("span", { class: "ek-task-icon", title: t(`ekinci.status.${item.status}`) }, icon(STATUS_ICON[item.status]),
      el("span", { class: "sr-only" }, t(`ekinci.status.${item.status}`))),
    body);
}

function roadmap(r) {
  const all = r.phases.flatMap((p) => p.tasks);
  const doneAll = all.filter((x) => x.status === "done").length;
  return section("roadmap", r.title, r.intro,
    el("div", { class: "card ek-overall" }, el("strong", {}, t("ekinci.overall")), progressBar(doneAll, all.length, t("ekinci.overall"))),
    el("div", { class: "ek-legend" }, ["done", "doing", "todo"].map((s) =>
      el("span", { class: `ek-task--${s}` }, icon(STATUS_ICON[s]), " ", t(`ekinci.status.${s}`)))),
    el("div", { class: "ek-phases" }, r.phases.map((p) => {
      const done = p.tasks.filter((x) => x.status === "done").length;
      return el("article", { class: `card ek-phase ek-phase--${p.status}`, id: p.id },
        el("header", { class: "ek-phase-head" },
          el("div", {}, el("h3", {}, L(p.title)), el("span", { class: "ek-when" }, L(p.when))),
          el("span", { class: `ek-badge ek-badge--${p.status}` }, t(`ekinci.phase.${p.status}`))),
        progressBar(done, p.tasks.length, L(p.title)),
        el("ul", { class: "ek-tasks" }, p.tasks.map(task)));
    })));
}

function log(lg) {
  const days = [...lg.days].reverse(); // newest first
  return section("log", lg.title, lg.intro,
    el("ol", { class: "timeline ek-log" }, days.map((d, i) =>
      el("li", { class: "tl-item" },
        el("span", { class: "tl-dot" }),
        el("details", { class: "card ek-day", open: i === 0 },
          el("summary", {},
            el("time", { datetime: d.date, class: "ek-day-date" }, fmtDate(d.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })),
            el("span", { class: "ek-day-title" }, L(d.title)),
            el("span", { class: "ek-day-meta" },
              icon("fa-solid fa-code-commit"), " ", t(d.commits === 1 ? "ekinci.commits.one" : "ekinci.commits.other", { n: d.commits }),
              el("span", { class: "ek-day-toggle" }, icon("fa-solid fa-chevron-down")))),
          el("ul", { class: "ek-day-items" }, d.items.map((x) => el("li", {}, L(x)))))))));
}

function refs(r) {
  return section("refs", r.title, r.intro, el("div", { class: "card-grid ek-refs" }, r.groups.map((g) =>
    el("article", { class: "card" },
      el("h3", {}, L(g.title)),
      el("ul", {}, g.items.map((i) =>
        el("li", {}, el("a", linkAttrs(i.href), L(i.label), " ", icon("fa-solid fa-arrow-up-right-from-square")))))))));
}

async function main() {
  const root = document.getElementById("ekinci");
  try {
    await renderShell();
    const data = await loadJSON("/data/ekinci.json");
    root.replaceChildren(
      hero(data),
      toc(data.toc),
      why(data.why),
      purpose(data.purpose),
      how(data.how),
      stack(data.stack),
      usage(data.usage),
      roadmap(data.roadmap),
      log(data.log),
      refs(data.refs),
      el("p", { class: "ek-footnote" }, icon("fa-solid fa-circle-info"), " ", L(data.note)));
    // Fade in small blocks, not whole sections: a long section may never be 12 % visible on a short screen.
    reveal(root.querySelectorAll(".ek-head, .ek-question, .ek-flow, .ek-formula, .ek-overall, .card-grid > *, .ek-log > li"));
    // Opening /pages/ekinci.html#roadmap lands on the section after rendering.
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (err) {
    showError(root, err);
  }
}

runPage(main);
