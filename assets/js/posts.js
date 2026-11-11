// Blog posts: shared loading helpers (used by blog, post, world, memories, home).
import { loadJSON, lang, t } from "./core.js";

const WORDS_PER_MINUTE = 200;
const showDrafts = new URLSearchParams(location.search).has("drafts");

/** Read the "--- key: value ---" block at the top of a Markdown file. */
export function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (!m) return { meta, body: text };
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: text.slice(m[0].length) };
}

/** All published posts (drafts too with ?drafts=1), newest first. */
export async function loadPostIndex() {
  const data = await loadJSON("/posts/index.json");
  return data.posts
    .filter((p) => showDrafts || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Show the page language if the post has it, else its first language. */
export const pickLang = (post) => (post.langs.includes(lang) ? lang : post.langs[0]);

const textCache = new Map();
/** Load one post's Markdown file and its title/summary. */
export async function loadPost(post, l = pickLang(post)) {
  const url = `/posts/${post.slug}/${l}.md`;
  if (!textCache.has(url)) {
    textCache.set(url, fetch(url, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
      return r.text();
    }));
  }
  const { meta, body } = parseFrontMatter(await textCache.get(url));
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    ...post,
    lang: l,
    title: meta.title || post.slug,
    summary: meta.summary || "",
    body,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}

export const loadAllPosts = async () => Promise.all((await loadPostIndex()).map((p) => loadPost(p)));

/** Posts about a country (and optionally one city). */
export const postsFor = (posts, country, city) =>
  posts.filter((p) => p.country === country && (!city || p.city === city));

/** Images can be full URLs or files inside the post's folder. */
export const assetURL = (post, src) =>
  !src ? "" : /^(https?:)?\/\//.test(src) || src.startsWith("/") ? src : `/posts/${post.slug}/${src}`;

export const formatDate = (iso) =>
  new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso + "T00:00:00"));

/** "Only in English" note when the post isn't written in the page language. */
export const langNote = (post) => (post.lang !== lang ? t("blog.onlyIn", { lang: t(`lang.${post.lang}`) }) : "");

/** Country and city names for a post, from countries.json. */
export async function placeOf(post) {
  if (!post.country) return null;
  const { countries } = await loadJSON("/data/countries.json");
  const country = countries.find((c) => c.id === post.country);
  const city = country?.cities?.find((x) => x.id === post.city);
  return country ? { country, city } : null;
}
