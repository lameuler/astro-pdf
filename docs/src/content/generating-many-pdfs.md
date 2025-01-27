---
title: Generating Many PDFs
---

By default, `astro-pdf` tries to load and process all pages in parallel. This helps to speed up build times, but can lead to issues when you need to generate a large number of PDF files. As Puppeteer cannot handle too many page loads at once, the loading may time out after the default navigation timeout of 30 seconds.

You can check the console logs from `astro-pdf` to see the time taken to load and process each page. If the time for each subsequent page keeps increasing (and nearing 30 seconds), it likely means too many pages are being loaded at once.

## Limit concurrency

To fix this, you can set the [`maxConcurrent`](reference/options#maxconcurrent) option to limit the number of pages loaded at once.

Setting it to `null` or `undefined` will run everything in parallel, while setting it to `1` will load and process each page sequentially.
This can help to completely avoid pages timing out due to Puppeteer being overloaded with page loads, but can significantly increase the total build time.

You may need to experiment with different values to balance the speed of the overall build with the likelihood of a page to time out.

## Set navigation timeout

You can also set the [`navTimeout`](reference/pageoptions#navtimeout) for each page to a longer time. Setting it to `0` will disable the timeout, but this is not recommended. The default used by Puppeteer is 30 seconds.

## Allow retries

There is also a [`maxRetries`](reference/pageoptions#maxretries) page option which is 0 by default but can be increased to allow `astro-pdf` to reattempt a page load.

This is useful if you do not want to limit the concurrency too much or set an unreasonable navigation timeout, as it will allow any pages which timed out to be loaded again, which should greatly reduce the chances of any page loads failing in the end.
