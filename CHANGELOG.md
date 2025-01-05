# astro-pdf

## 1.5.0

### Minor Changes

- [#66](https://github.com/lameuler/astro-pdf/pull/66) [`890360d`](https://github.com/lameuler/astro-pdf/commit/890360d1d670e214e9973ff24ce142912fdd7c43) Thanks [@lameuler](https://github.com/lameuler)! - added `runBefore` and `runAfter` hooks to run a callback before or after `astro-pdf` runs

## 1.4.1

### Patch Changes

- [#63](https://github.com/lameuler/astro-pdf/pull/63) [`46c10df`](https://github.com/lameuler/astro-pdf/commit/46c10df611ee67c498543ee8d41d37f7c98a7be1) Thanks [@lameuler](https://github.com/lameuler)! - log current and max attempts for retries and error message for pdf write errors

## 1.4.0

### Minor Changes

- [#61](https://github.com/lameuler/astro-pdf/pull/61) [`6683ed3`](https://github.com/lameuler/astro-pdf/commit/6683ed30da28ca9a6b97d17a6993ecea4805f5a1) Thanks [@lameuler](https://github.com/lameuler)! - added `throwOnFail` page option to throw an error if a page fails (and cause the build to fail) instead of just logging them

- [#61](https://github.com/lameuler/astro-pdf/pull/61) [`6683ed3`](https://github.com/lameuler/astro-pdf/commit/6683ed30da28ca9a6b97d17a6993ecea4805f5a1) Thanks [@lameuler](https://github.com/lameuler)! - added `maxRetries` page options to allow retrying the loading/processing of a page if an error occurs

- [#61](https://github.com/lameuler/astro-pdf/pull/61) [`6683ed3`](https://github.com/lameuler/astro-pdf/commit/6683ed30da28ca9a6b97d17a6993ecea4805f5a1) Thanks [@lameuler](https://github.com/lameuler)! - added `navTimeout` page option to set Puppeteer's default navigation timeout for the page

- [#61](https://github.com/lameuler/astro-pdf/pull/61) [`6683ed3`](https://github.com/lameuler/astro-pdf/commit/6683ed30da28ca9a6b97d17a6993ecea4805f5a1) Thanks [@lameuler](https://github.com/lameuler)! - added `maxConcurrent` option to specify the maximum number of pages to load and process at once. this can help prevent navigation timeouts caused when trying to load too many pages at the same time.

## 1.3.0

### Minor Changes

- [#56](https://github.com/lameuler/astro-pdf/pull/56) [`3b78004`](https://github.com/lameuler/astro-pdf/commit/3b78004094dce03eb27dc7bf724b579eac4b85d0) Thanks [@lameuler](https://github.com/lameuler)! - Adds support for Astro v5.0. Upgrading to Astro v5.0 should have no impact on compatibility with `astro-pdf`.

- [#56](https://github.com/lameuler/astro-pdf/pull/56) [`3b78004`](https://github.com/lameuler/astro-pdf/commit/3b78004094dce03eb27dc7bf724b579eac4b85d0) Thanks [@lameuler](https://github.com/lameuler)! - Bumped `puppeteer` to 23.10.1. Updated to use the new merged [`LaunchOptions`](https://pptr.dev/api/puppeteer.launchoptions) type. This should have no impact on compatibility unless you are manually defining the types of your options, in which case you may need to update to the latest version of puppeteer and replace the `PuppeteerLaunchOptions` type with the `LaunchOptions` type if you get type errors.

    ```diff
    - import type { PuppeteerLaunchOptions } from 'puppeteer'
    + import type { LaunchOptions } from 'puppeteer'
    ```

### Patch Changes

- [#56](https://github.com/lameuler/astro-pdf/pull/56) [`3b78004`](https://github.com/lameuler/astro-pdf/commit/3b78004094dce03eb27dc7bf724b579eac4b85d0) Thanks [@lameuler](https://github.com/lameuler)! - Fixes check for default browser executable when using Puppeteer ^23.10.0

## 1.2.0

### Minor Changes

- [#52](https://github.com/lameuler/astro-pdf/pull/52) [`978eb84`](https://github.com/lameuler/astro-pdf/commit/978eb843528ed542586d796a16bfca81cd1eae0b) Thanks [@lameuler](https://github.com/lameuler)! - allow generating multiple PDFs for a location by specifiying an array of entries rather than just one entry for each location

### Patch Changes

- [#50](https://github.com/lameuler/astro-pdf/pull/50) [`7518212`](https://github.com/lameuler/astro-pdf/commit/75182123e1f455a506f2fcaa31b3efa056e7436f) Thanks [@lameuler](https://github.com/lameuler)! - improves handling of [3XX status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages) which are not redirects (e.g. [`304 Not Modified`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304))

## 1.1.1

### Patch Changes

- [#42](https://github.com/lameuler/astro-pdf/pull/42) [`4662768`](https://github.com/lameuler/astro-pdf/commit/46627689f203d57cb3fecaba3468e5f55279f3b8) Thanks [@lameuler](https://github.com/lameuler)! - export `ServerOutput` type

## 1.1.0

### Minor Changes

- [#38](https://github.com/lameuler/astro-pdf/pull/38) [`5eb12ab`](https://github.com/lameuler/astro-pdf/commit/5eb12ab1034892900dc86a7bc74c8f33ca77ee7b) Thanks [@lameuler](https://github.com/lameuler)! - Allow specifying a custom server to use for loading the built pages instead of the default `astro-preview`

## 1.0.0

### Major Changes

- [#28](https://github.com/lameuler/astro-pdf/pull/28) [`1c234ab`](https://github.com/lameuler/astro-pdf/commit/1c234abfd8882a32704937b93b60a69ab9141583) Thanks [@lameuler](https://github.com/lameuler)! - **v1!** First major release of `astro-pdf` 🎉
