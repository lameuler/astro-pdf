---
title: Troubleshooting
description: Troubleshoot common configuration issues which can cause unexpected results when generating PDFs. Find out how to debug unexpected errors while using astro-pdf.
---

## Missing content or timeouts

If you encounter issues like missing images, or the page timing out, you can likely fix the issue with configuration changes.

If the [`waitUntil` page option](reference/pagesoptions#waituntil) is too short, some content may not be loaded before the PDF is generated. But if it is too long, it may result in a timeout.

The [`navTimeout` page option](reference/pageoptions#navtimeout) applies while the page is being loaded, and setting the `timeout` in the [`pdf` page option](reference/pagesoptions#pdf) applies when Puppeteer is generating the PDF from the loade page content.

See the guides on [generating many PDFs](generating-many-pdfs.md) and [loading images](loading-images.md) for more details.

## Debug errors

If you encounter errors while using `astro-pdf`, or some unexpected behaviour, you can run the Astro build with the `--verbose` flag to get more details on the errors and what `astro-pdf` is doing.

```sh
npm run build -- --verbose
```

`astro-pdf` logs all errors and their stack traces when the `--verbose` flag is set, rather than just the error message in the normal logging.

If you encounter an unexpected error, or suspect that there is an issue with `astro-pdf` itself, you can [submit a bug report](https://github.com/lameuler/astro-pdf/issues/new?template=0-bug.yml).
