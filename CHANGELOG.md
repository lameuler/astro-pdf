# astro-pdf

## 1.7.0

### Minor Changes

- [#75](https://github.com/lameuler/astro-pdf/pull/75) [`cafc705`](https://github.com/lameuler/astro-pdf/commit/cafc7057315c83224661eab46e5ea2303402e3f8) Thanks [@lameuler](https://github.com/lameuler)! - Add `preCallback` page option to configure the Puppeteer `Page` before navigation

- [#84](https://github.com/lameuler/astro-pdf/pull/84) [`7bc4eee`](https://github.com/lameuler/astro-pdf/commit/7bc4eee358450f1faeea6946bd1c001ac55034b2) Thanks [@lameuler](https://github.com/lameuler)! - add `ensurePath` page option to throw if there is a filename conflict instead of adding a suffix to the path

- [#79](https://github.com/lameuler/astro-pdf/pull/79) [`cf1500a`](https://github.com/lameuler/astro-pdf/commit/cf1500a511b288838d33c92c29bcad12c8707924) Thanks [@DeyLak](https://github.com/DeyLak)! - Allow passing a callback for the `pdf` page option to dynamically set `PDFOptions`

- [#78](https://github.com/lameuler/astro-pdf/pull/78) [`5944756`](https://github.com/lameuler/astro-pdf/commit/59447569b6f30f7d657a52572c2f3b38a8429866) Thanks [@lameuler](https://github.com/lameuler)! - added `page: Page` parameter to `path` option callback, and allow it to return a Promise. this can be used to dynamically set the PDF output path based on the page content

- [#76](https://github.com/lameuler/astro-pdf/pull/76) [`e699220`](https://github.com/lameuler/astro-pdf/commit/e69922090de74bbfbc66e5d62ce99bcb439a964e) Thanks [@lameuler](https://github.com/lameuler)! - Added `isolated` page option to create a new browser context for that page which will not share cookies and cache with other pages

- [#83](https://github.com/lameuler/astro-pdf/pull/83) [`3d07ce7`](https://github.com/lameuler/astro-pdf/commit/3d07ce7a4f5a94ef758fe3ace8a2580f6d6614e2) Thanks [@lameuler](https://github.com/lameuler)! - added `throwErrors` option to prevent `astro-pdf` from causing Astro build fails. Fixed the error handling of custom servers to be consistent with the new option.

- [#75](https://github.com/lameuler/astro-pdf/pull/75) [`cafc705`](https://github.com/lameuler/astro-pdf/commit/cafc7057315c83224661eab46e5ea2303402e3f8) Thanks [@lameuler](https://github.com/lameuler)! - Add `browserCallback` option to configure the Puppeteer `Browser` before any pages are processed

### Patch Changes

- [#73](https://github.com/lameuler/astro-pdf/pull/73) [`1f0e8b0`](https://github.com/lameuler/astro-pdf/commit/1f0e8b08395b58e55bcf29f4af6957905a81ca3a) Thanks [@lameuler](https://github.com/lameuler)! - Ensure that all pages and the browser are closed properly when errors are encountered

- [#81](https://github.com/lameuler/astro-pdf/pull/81) [`0dcbd2b`](https://github.com/lameuler/astro-pdf/commit/0dcbd2b71dc1e4830c6f30f523dd3dc4e7d658eb) Thanks [@lameuler](https://github.com/lameuler)! - throw an error if the output `path` is a directory (i.e. has a trailing slash)

## 1.6.0

### Minor Changes

- [#68](https://github.com/lameuler/astro-pdf/pull/68) [`2a2d9cc`](https://github.com/lameuler/astro-pdf/commit/2a2d9cc282e32cff62beb84314bb5a90e681577c) Thanks [@DeyLak](https://github.com/DeyLak)! - added puppeteer `Viewport` option support

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
