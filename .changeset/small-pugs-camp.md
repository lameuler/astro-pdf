---
'astro-pdf': major
---

Removed the `ensurePath` page option. In v2, `astro-pdf` will no longer add suffixes to paths to prevent conflicts.
If attempting to overwrite a file, the processing of that page will always fail.

This helps to ensure that the output of `astro-pdf` is consistent, as page processing can be done in parallel, leading to different suffixes between builds with no way to link to the files.
