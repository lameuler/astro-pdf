---
title: Migrate to astro-pdf v2
---

## Breaking changes

### Removed `install` option

In v1, `astro-pdf` would check the executable path specified in the [Puppeteer configuration](https://pptr.dev/guides/configuration), and if the executable was not found, it would try to install the [latest `stable` version of Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/) (which may not be the same as the pinned version which the installed version of Puppeteer installs by default). This would make it difficult to do a custom browser installation without `astro-pdf` also installing a browser.

As such, in v2, `astro-pdf` will no longer handle the installation of browsers, and instead leaves the task to the user.

#### What should I do?

To use any custom browser, install the browser yourself and pass the [`browser`](https://pptr.dev/browsers-api/browsers.browser) and `executablePath` to the `launch` option.

```js
// https://astro.build/config
export default defineConfig({
    integrations: [
        pdf({
            install: true, // [!code --]
            launch: {
                // the browser (eg 'chrome') and executable path of the installed browser.  // [!code ++]
                browser: '...', // [!code ++]
                executablePath: '...' // [!code ++]
            }
        })
    ]
})
```

In order to prevent Puppeteer from installing a browser automatically, you may also want to set `skipDownload` in the [Puppeteer configuration](https://pptr.dev/api/puppeteer.configuration), or set the `PUPPETEER_SKIP_DOWNLOAD` environment variable.

```js
// .puppeteerrc.js
export default {
    skipDownload: true
}
```

For most cases, the version of Chrome which Puppeteer automatically installs in its `postinstall` script (or by running `npx puppeteer browsers install`) can be used which having to do any other configuration. If you wish recreate the behaviour of the removed `install` option, you can install the `@puppeteer/browsers` package.

```ts
import { install, resolveBuildId, Browser, detectBrowserPlatform } from '@puppeteer/browsers'

const platform = detectBrowserPlatform()
if (platform) {
    const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')
    const installed = await install(buildId)
    console.log(installed.browser, installed.executablePath)
}
```
