---
'astro-pdf': minor
---

added `page: Page` parameter to `path` option callback, and allow it to return a Promise. this can be used to dynamically set the PDF output path based on the page content
