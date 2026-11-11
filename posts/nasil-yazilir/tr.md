---
title: Blog yazısı nasıl yazılır?
summary: Bu bir taslak rehber. Yeni bir anı yazısı eklemek için gereken her şey burada.
---

Bu yazı sadece **taslak** olarak duruyor, sitede görünmüyor. Yeni yazı eklerken buraya bakabilirsin.

## 1. Klasör oluştur

`posts/` içinde yazına bir klasör aç, örneğin `posts/krakow-ilk-gun/`. İçine `tr.md` (ve istersen `en.md`) dosyasını koy. Yazının fotoğraflarını da aynı klasöre atabilirsin.

## 2. Listeye ekle

`posts/index.json` dosyasına bir satır ekle:

```json
{ "slug": "krakow-ilk-gun", "date": "2024-10-05", "langs": ["tr"], "country": "PL", "city": "krakow", "cover": "kapak.jpg", "tags": ["erasmus"] }
```

`country` ve `city` yazarsan yazı otomatik olarak o ülkenin kartında, şehir haritasında ve şehrin fotoğraflarının yanında görünür.

## 3. Yaz

Markdown çok basit:

- `**kalın**` → **kalın**, `*italik*` → *italik*
- `## Başlık` → yeni bir bölüm
- `- madde` → liste
- `[link](https://...)` → bağlantı
- `![Fotoğraf açıklaması](foto1.jpg)` → fotoğraf (açıklama altında yazı olarak görünür)

> Alıntı yapmak için satırın başına `>` koy.

![Opole'den bir kare](https://ik.imagekit.io/iskburcin/pl/pl/img7.jpg)

Hepsi bu kadar. Kaydedip GitHub'a gönderdiğinde yazı birkaç dakika içinde sitede olur.
