---
'astro-pdf': minor
---

Bumped `puppeteer` to 23.10.1. Updated to use the new merged [`LaunchOptions`](https://pptr.dev/api/puppeteer.launchoptions) type. This should have no impact on compatibility unless you are manually defining the types of your options, in which case you may need to update to the latest version of puppeteer and replace the `PuppeteerLaunchOptions` type with the `LaunchOptions` type if you get type errors.

```diff
- import type { PuppeteerLaunchOptions } from 'puppeteer'
+ import type { LaunchOptions } from 'puppeteer'
```
