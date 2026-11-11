import { renderShell, el, icon, linkAttrs, showError, timeIn, t, L, lang, runPage, pageSignal, pageInterval } from "./core.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Validation: one rule per field ---------- */
const rules = {
  name: (v) => (v.trim().length >= 2 ? "" : t("contact.errName")),
  email: (v) => (EMAIL_RE.test(v.trim()) ? "" : t("contact.errEmail")),
  message: (v) => (v.trim().length >= 10 ? "" : t("contact.errMessage")),
};

function validateField(input) {
  const msg = rules[input.name]?.(input.value) ?? "";
  const field = input.closest(".field");
  field.classList.toggle("invalid", !!msg);
  field.querySelector(".error").textContent = msg;
  input.setAttribute("aria-invalid", String(!!msg));
  return !msg;
}

function setStatus(node, kind, text) {
  node.hidden = false;
  node.className = `form-status ${kind}`;
  node.textContent = text;
}

/* Save the unsent draft so a refresh doesn't lose it. */
const DRAFT = "contact-draft";
const saveDraft = (form) => {
  try { localStorage.setItem(DRAFT, JSON.stringify(Object.fromEntries(new FormData(form)))); } catch {}
};
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT)) || {}; } catch { return {}; } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT); } catch {} };

async function main() {
  try {
    const site = await renderShell();
    const c = site.contact;
    document.getElementById("intro").textContent = L(c.intro);

    /* Right column: status + local time */
    const clock = el("strong", {}, timeIn(site.timezone));
    pageInterval(() => (clock.textContent = timeIn(site.timezone)), 15_000);
    const signal = pageSignal();
    document.getElementById("now").replaceChildren(
      el("p", { class: "status", style: { display: "flex", gap: "8px", alignItems: "center", color: "var(--text)", fontWeight: 600 } },
        el("span", { class: "dot" }), L(c.availability)),
      el("p", { style: { marginTop: "8px" } }, icon("fa-solid fa-clock"), " ",
        // "{time}" is replaced by the live clock element
        ...t("contact.now", { place: L(site.location) }).split("{time}").flatMap((part, i) => (i ? [clock, part] : [part]))),
      el("p", {}, icon("fa-solid fa-reply"), " ", L(c.responseTime))
    );

    /* Email with copy button */
    const copyBtn = el("button", { class: "btn", type: "button" }, icon("fa-regular fa-copy"), t("ui.copy"));
    copyBtn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(site.email); copyBtn.lastChild.textContent = t("ui.copied"); }
      catch { copyBtn.lastChild.textContent = t("contact.copyFallback"); }
      setTimeout(() => (copyBtn.lastChild.textContent = t("ui.copy")), 1500);
    });
    document.getElementById("email-box").replaceChildren(el("a", { href: `mailto:${site.email}` }, site.email), copyBtn);

    /* Socials */
    document.getElementById("socials").replaceChildren(...site.socials.filter((s) => s.id !== "email" && !s.group).map((s) =>
      el("a", { class: "social-link", ...linkAttrs(s.url) },
        el("span", { class: "ico", style: { background: s.color } }, icon(s.icon)),
        el("span", { class: "txt" }, el("strong", {}, L(s.label)), el("span", {}, s.handle)))
    ));

    /* FAQ */
    document.querySelectorAll("#faq details").forEach((d) => d.remove());
    document.getElementById("faq").append(...c.faq.map((f) =>
      el("details", {}, el("summary", {}, L(f.q)), el("p", {}, L(f.a)))));

    /* Form */
    const form = document.getElementById("form");
    const status = document.getElementById("status");
    const sendBtn = document.getElementById("send");
    const chars = document.getElementById("chars");
    sendBtn.lastChild.textContent = " " + t("contact.send");
    const msg = form.message;
    const topics = c.topics.map(L);
    let topic = topics[0];

    const topicBtns = topics.map((label) => el("button", {
      class: "chip", type: "button", role: "radio",
      onclick: () => { topic = label; topicBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === label))); saveDraft(form); },
    }, label));
    document.getElementById("topics").replaceChildren(...topicBtns);

    // restore draft
    const draft = loadDraft();
    for (const k of ["name", "email", "message"]) if (draft[k]) form.elements[k].value = draft[k];
    if (draft.topic && topics.includes(draft.topic)) topic = draft.topic;
    topicBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === topic)));
    form.querySelectorAll("input[type=hidden]").forEach((n) => n.remove());
    form.append(el("input", { type: "hidden", name: "topic", value: topic }), el("input", { type: "hidden", name: "language", value: lang }));

    const updateCount = () => (chars.textContent = `${msg.value.length} / ${msg.maxLength}`);
    updateCount();
    form.addEventListener("input", (e) => {
      form.topic.value = topic;
      if (e.target === msg) updateCount();
      if (e.target.closest(".field.invalid")) validateField(e.target); // re-check only after first error
      saveDraft(form);
    }, { signal });
    form.querySelectorAll("input[required], textarea").forEach((i) => i.addEventListener("blur", () => i.value && validateField(i), { signal }));
    // after a language switch, show any visible errors in the new language
    form.querySelectorAll(".field.invalid input, .field.invalid textarea").forEach(validateField);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.topic.value = topic;
      const fields = [form.elements.name, form.email, msg];
      const ok = fields.map(validateField).every(Boolean);
      if (!ok) { fields.find((f) => f.getAttribute("aria-invalid") === "true").focus(); return; }
      if (form._gotcha.value) return; // bot

      // No form service configured: open the visitor's mail app with everything filled in.
      if (!c.formEndpoint) {
        const subject = encodeURIComponent(`[Website] ${topic}, from ${form.elements.name.value.trim()}`);
        const body = encodeURIComponent(`${msg.value.trim()}\n\n${form.elements.name.value.trim()} <${form.email.value.trim()}>`);
        location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
        setStatus(status, "ok", t("contact.mailto"));
        return;
      }

      sendBtn.disabled = true;
      sendBtn.lastChild.textContent = " " + t("contact.sending");
      try {
        const res = await fetch(c.formEndpoint, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        form.reset();
        clearDraft();
        updateCount();
        setStatus(status, "ok", `${t("contact.sent")} ${L(c.responseTime)}`);
      } catch (err) {
        console.error(err);
        setStatus(status, "err", t("contact.failed", { email: site.email }));
      } finally {
        sendBtn.disabled = false;
        sendBtn.lastChild.textContent = " " + t("contact.send");
      }
    }, { signal });
  } catch (err) {
    showError(document.querySelector("main"), err);
  }
}

runPage(main);
