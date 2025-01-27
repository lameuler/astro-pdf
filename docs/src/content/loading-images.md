---
title: Loading Images
description: Configure astro-pdf to wait for all images to load, including images with loading='lazy'. This will ensure that all images appear in the generated PDF files.
---

## Wait for images

To ensure that all images are loaded before the PDF is generated, you may need to set the [`waitUntil` page option](reference/pageoptions#waituntil) to `networkidle0`.

```ts
const pageOptions = {
    waitUntil: 'networkidle0'
}
```

Alternatively, `networkidle2` may be a better choice if your page does long-polling or other side activity which results in long-lived network requests. In that case you may experience timeouts with `networkidle0`.
See [this Puppeteer issue](https://github.com/puppeteer/puppeteer/issues/1552) for mroe information.

If you require more control over the behaviour of `waitUntil`, you can instead add a [`callback`](reference/pageoptions#callback) which awaits [`waitForNetworkIdle`](https://pptr.dev/api/puppeteer.page.waitfornetworkidle). Refer to the example below for more details.

## Lazily loaded images

Images with `loading="lazy"` may not appear in the PDF if they are initially outside the Puppeteer viewport.

You can use the [`callback`](reference/pageoptions#callback) page option to modify all the images in the page to be eagerly loaded, and then wait for the loading to finish.

```ts
const pageOptions = {
    callback: async (page) => {
        await page.$$eval('img[loading=lazy]', (imgs) => {
            imgs.forEach((img) => {
                img.loading = 'eager'
            })
        })
        // wait for all images to load
        await page.waitForNetworkIdle()
    },
    // this does not matter much since waiting is done in callback
    waitUntil: 'load'
}
```

You can configure the maximum number of network connections to be considered inactive/idle (default `0`), and the time that the network must be idle (default `500` milliseconds) when calling [`waitForNetworkIdle`](https://pptr.dev/api/puppeteer.page.waitfornetworkidle). The default behaviour is the same as setting `waitUntil` to `networkidle0`.

If you do this, then you can also set [`waitUntil`](reference/pageoptions#waituntil) to a faster option like `load`, as either way you will be waiting for all the network requests to finish with `waitForNetworkIdle`.
