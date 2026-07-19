---
'astro-pdf': patch
---

Fix `preinstall` breaking installs in offline, sandboxed, or hermetic environments (e.g. Nix builds, air-gapped CI).

The pnpm-only guard previously ran `npx only-allow pnpm` in a `preinstall` hook, which is fetched over the network on every install — including when astro-pdf is installed as a dependency — and fails when there is no network access. The `preinstall` hook has been removed entirely; pnpm is now enforced for contributors via the `devEngines.packageManager` field, which is only checked when installing this repository itself, so consumers are never affected.
