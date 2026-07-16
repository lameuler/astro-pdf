---
'astro-pdf': patch
---

Fix `preinstall` breaking installs in offline, sandboxed, or hermetic environments (e.g. Nix builds, air-gapped CI).

The pnpm-only guard previously ran `npx only-allow pnpm`, which is fetched over the network on every install — including when astro-pdf is installed as a dependency — and fails when there is no network access. It now runs a small bundled script that enforces pnpm only when installing this repository itself, using nothing but Node builtins, so consumers are never affected.
