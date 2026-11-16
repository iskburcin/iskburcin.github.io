# iskburcin.github.io

My personal website, served by GitHub Pages. No build step: plain HTML, CSS and JavaScript modules.
All content lives in `/data/*.json`. Edit a JSON file, push, and the site updates.

## How to change content

| I want to…                         | Edit                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| Change name, avatar, socials, email | `data/site.json`                                           |
| Add / move / remove a home box      | `data/home.json` (`type` + `size`: s, w, t, l)             |
| Edit About text, projects, skills   | `data/about.json`                                          |
| Add a code snippet                  | put the file in `snippets/<category>/` + one entry in `data/snippets.json` |
| Add a visited country / gallery     | `data/countries.json` (id = 2-letter code from `assets/src/world.svg`) |
| Make the contact form send emails   | `contact.formEndpoint` in `data/site.json` (see below)     |
| Update my CV                        | edit `data/cv.json`, open `/pages/cv.html?lang=en` (and `tr`), Print → Save as PDF into `assets/src/burcin-isik-cv-en.pdf` / `-tr.pdf` |
| Edit my journey / timeline          | `data/timeline.json`                                       |
| Update the Ekinci project docs     | `data/ekinci.json` (roadmap task: `status` done/doing/todo + `date`; one `log.days` entry per working day) |
| Turn on the visitor counter         | free account at goatcounter.com → Settings: tick "Allow adding visitor counts on your website" → put your code in `"goatcounter"` in `data/site.json` |

### Blog posts
1. Create a folder `posts/<post-name>/` with `tr.md` and/or `en.md`. Start each file with:
   ```
   ---
   title: Kraków'da ilk günüm
   summary: One or two sentences shown on the blog list.
   ---
   ```
   then write in Markdown. Photos can sit in the same folder: `![caption](photo1.jpg)`.
2. Add one entry to `posts/index.json` (date, langs, country, city, cover, tags).
   `country` + `city` link the post to the map, the country card and the city's photos.
3. `"draft": true` keeps a post hidden; preview drafts at `/pages/blog.html?drafts=1`.
   The draft `posts/nasil-yazilir/` is a full writing guide.

### Languages (English / Türkçe)
- Buttons, labels and page headings: `data/i18n.json`, one block per language.
- Content: any text in the other JSON files can be either a plain string (same in every language)
  or `{ "en": "Hello", "tr": "Merhaba" }`. A missing language falls back to English.
- The site picks the language in this order: `?lang=tr` in the URL → the visitor's last choice
  → the browser's language → English.
- **Add a new language** (e.g. German): add `{ "code": "de", "short": "DE", "label": "Deutsch" }`
  to `languages` in `i18n.json`, copy the `"en"` block as `"de"` and translate it,
  then add `"de": "..."` to the content texts you want translated.

### Contact form
GitHub Pages can't run PHP, so the form uses [Formspree](https://formspree.io) (free plan: 50 messages/month).
1. Create a form on formspree.io with your email.
2. Copy the endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
3. Paste it into `data/site.json` → `"contact": { "formEndpoint": "…" }`.

While it's empty, the form opens the visitor's mail app with the message already filled in.

### Travel photos
Upload to ImageKit as `img1.jpg … imgN.jpg` in one folder (`name_changer.py` renames them),
then set `photos.base` and `photos.count` in `data/countries.json`.

## Run locally
`fetch()` doesn't work from `file://`, so use a tiny server:

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Structure
```
index.html            bento home
pages/                about, tech, world, memories, contact, ekinci (capstone project docs)
assets/css/           main.css (tokens + shared), home.css, pages.css
assets/js/            core.js (shared helpers) + one module per page
data/                 all content (JSON)
snippets/             code files shown on the Tech page
v1/                   the first version of the site, kept as an archive
```
