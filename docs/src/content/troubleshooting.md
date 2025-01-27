---
title: Troubleshooting
description: Troubleshoot common configuration issues which can cause unexpected results when generating PDFs. Find out how to debug unexpected errors while using astro-pdf.
---

## Missing content or timeouts

If you encounter issues like missing images, or the page timing out, you can likely fix the issue with configuration changes.

If the [`waitUntil` page option](reference/pagesoptions#waituntil) is too short, some content may not be loaded before the PDF is generated. But if it is too long, it may result in a timeout.

The [`navTimeout` page option](reference/pageoptions#navtimeout) applies while the page is being loaded, and setting the `timeout` in the [`pdf` page option](reference/pagesoptions#pdf) applies when Puppeteer is generating the PDF from the loade page content.

See the guides on [generating many PDFs](generating-many-pdfs.md) and [loading images](loading-images.md) for more details.

## Output locations

When you try to generate multiple PDFs to the same filepath, `astro-pdf` will add a counter suffix to prevent overwriting files and having conflicts while writing the files.
However it is recommended to specify unique filenames for each PDF to be able to link to them consistently. Use the [`ensurePath` page option](reference/pageoptions#ensurepath) to ensure the PDF is generated at the path specified.

Since `astro-pdf` processes the pages in parallel, the order in which pages finish loading and start getting written to disk may change between builds.
This means resulting filenames of PDFs may not be the same every time if there are conflicting filenames.

If there are errors while a PDF is being generated or written, the file will be deleted. This can, for example, lead to there being a `file-1.pdf` without a `file.pdf` in the final build, as `file.pdf` encountered an error (and got deleted) after `file-1.pdf` starting writing to disk.

## Debug errors

If you encounter errors while using `astro-pdf`, or some unexpected behaviour, you can run the Astro build with the `--verbose` flag to get more details on the errors and what `astro-pdf` is doing.

```sh
npm run build -- --verbose
```

`astro-pdf` logs all errors and their stack traces when the `--verbose` flag is set, rather than just the error message in the normal logging.

If you encounter an unexpected error, or suspect that there is an issue with `astro-pdf` itself, you can [submit a bug report](https://github.com/lameuler/astro-pdf/issues/new?template=0-bug.yml).
