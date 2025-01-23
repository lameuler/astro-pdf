---
'astro-pdf': patch
---

delete PDF files which failed to generate fully (e.g. timed out).
this allows subsequent retries to still use the same output path.
