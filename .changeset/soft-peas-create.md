---
'astro-pdf': major
---

Removed the `install` option. In v2, `astro-pdf` will no longer handle the installation of browsers, and instead leaves the task to the user.

To use any custom browser, pass the [`browser`](https://pptr.dev/browsers-api/browsers.browser) and `executablePath` to the `launch` option.

```diff
// https://astro.build/config
export default defineConfig({
    integrations: [pdf({
-       install: true,
+       launch: {
+           // the browser (eg 'chrome') and executable path of the installed browser.
+           browser: '...',
+           executablePath: '...'
+       },
    })]
})
```

Find out more in the [migration guide](https://ler.quest/astro-pdf/migrate-to-v2/#removed-install-option).
