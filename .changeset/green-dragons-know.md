---
'astro-pdf': minor
---

⚠️ Deprecated the `install` option. Instead, [configure Puppeteer](https://pptr.dev/guides/configuration) to choose which browser to install or manually install a browser and pass the `executablePath` to the [`launch` option](https://ler.quest/astro-pdf/reference/options#launch). In the next major version, `astro-pdf` will no longer handle the installation of browsers.
