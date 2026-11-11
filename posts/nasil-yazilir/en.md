---
title: How to write a blog post
summary: A draft guide. Everything needed to add a new memory post is here.
---

This post is a **draft**, so it doesn't appear on the site. Use it as a reference when adding a new post.

## 1. Create a folder

Make a folder for your post inside `posts/`, for example `posts/krakow-first-day/`. Put `en.md` (and `tr.md` if you like) inside. The post's photos can go in the same folder.

## 2. Add it to the list

Add one entry to `posts/index.json`:

```json
{ "slug": "krakow-first-day", "date": "2024-10-05", "langs": ["en"], "country": "PL", "city": "krakow", "cover": "cover.jpg", "tags": ["erasmus"] }
```

With `country` and `city`, the post automatically shows up on that country's card, on its city map and next to the city's photos.

## 3. Write

Markdown is simple:

- `**bold**` → **bold**, `*italic*` → *italic*
- `## Heading` → a new section
- `- item` → a list
- `[link](https://...)` → a link
- `![Photo caption](photo1.jpg)` → a photo (the caption shows under it)

> Start a line with `>` for a quote.

![A view from Opole](https://ik.imagekit.io/iskburcin/pl/pl/img7.jpg)

That's it. Save, push to GitHub, and the post is live within a few minutes.
