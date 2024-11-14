---
'astro-pdf': patch
---

improves handling of [3XX status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages) which are not redirects (e.g. [`304 Not Modified`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304))
