---
title: Configuring Puppeteer
description: Setup a Puppeteer configuration file to control which browser it installs and uses. Handle common sandbox related issues with Puppeteer on Linux and Windows.
---

When `astro-pdf` is installed, it installs `puppeteer`, which will automatically install a recent version of Chrome. However, you can [configure Puppeteer](https://pptr.dev/guides/configuration) to prevent this.

`astro-pdf` also gives you the [option to install a browser](reference/options#install) when it runs.

## Puppeteer config file

The [Puppeteer config file](https://pptr.dev/guides/configuration#configuration-files) can be used to set the browsers installed, the location to install browsers, and more. Refer to the [Puppeteer API documentation](https://pptr.dev/api/puppeteer.configuration) for all the options.

### Install browser with CLI

If you need to re-install browsers after updating the config file, you can use the `puppeteer browsers` CLI.

```sh
npx puppeteer browsers install
```

This will install the browsers configued in your config file. This will also work to install the default browser if there is no config file.

Or, you can also use it to install a specific browser/version.

```sh
npx puppeteer browsers install chrome@131.0.6778.204
```

### Skip browser download

To stop Puppeteer from downloading a browser by default, you can set `skipDownload` to `true` in you Puppeteer config file.

```js
{
    skipDownload: true
}
```

You can also set `PUPPETEER_SKIP_DOWNLOAD` environment variable when installing `astro-pdf` (or `puppeteer`) to prevent it from installing a browser.

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

You can then use the [`install` option](reference/options#install) to control which browser to install when `astro-pdf` runs.

## Linux AppArmor profile

On some newer Linux distros like Ubuntu 23.10+, you may run into a `No usable sandbox!` error. This will likely be the case if you are building your site using the `ubuntu-latest` GitHub Actions runner.

To fix this, you can create an AppArmor profile to allow Puppeteer's installations of chrome to run.

```bash
sudo tee /etc/apparmor.d/chrome-dev-builds <<EOF
abi <abi/4.0>,
include <tunables/global>

# default executable location for puppeteer
profile chrome $HOME/.cache/puppeteer/chrome/*/chrome-linux64/chrome flags=(unconfined) {
    userns,

    # Site-specific additions and overrides. See local/README for details.
    include if exists <local/chrome>
}

# if you are installing other versions using the install option
profile chrome-local $PWD/node_modules/.astro/chrome/*/chrome-linux64/chrome flags=(unconfined) {
    userns,

    # Site-specific additions and overrides. See local/README for details.
    include if exists <local/chrome>
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/chrome-dev-builds
sudo service apparmor reload
```

You may need to change the target path of the profile depending on where Puppeteer has installed chrome.

For more information and options, refer to the [Chromium Docs](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md).

Alternatively, for GitHub Actions, use the `ubuntu-22.04` runner instead.

## Windows sandbox errors

If Puppeteer times out while generating PDFs on Windows, it may be due to [sandbox errors](https://pptr.dev/troubleshooting#chrome-reports-sandbox-errors-on-windows).

To address this, you can run the following command in command prompt if you are using the default installation of Chrome.

```
icacls "%USERPROFILE%/.cache/puppeteer/chrome" /grant *S-1-15-2-1:(OI)(CI)(RX)
```

Or, if you have set [`Options.install`](reference/options#install), run:

```
icacls "<cacheDir>/chrome" /grant *S-1-15-2-1:(OI)(CI)(RX)
```

with the specified `cacheDir` (defaults to [Astro's cacheDir](https://docs.astro.build/en/reference/configuration-reference/#cachedir) of `node_modules/.astro`).
