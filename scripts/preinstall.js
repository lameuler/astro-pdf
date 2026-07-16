/**
 * Enforce pnpm for contributors without breaking consumers, who also run this
 * `preinstall` when astro-pdf is a dependency. We only enforce when this repo is
 * the install root (`INIT_CWD` === cwd) and otherwise do nothing.
 *
 * Runs before `node_modules` exists, so it must use only Node builtins.
 */
import { resolve } from 'node:path'

const initCwd = process.env.INIT_CWD

// Not a top-level install of this repo (i.e. astro-pdf is being installed as a
// dependency, or the script was run directly) — nothing to enforce.
if (!initCwd || resolve(initCwd) !== process.cwd()) {
    process.exit(0)
}

const userAgent = process.env.npm_config_user_agent ?? ''

if (!userAgent.startsWith('pnpm')) {
    // \x1b[31m/\x1b[39m are raw ANSI red on/off — kleur isn't installed yet.
    console.error(
        '\n\x1b[31mThis repository must be installed with pnpm (see the "packageManager" field).\n' +
            'Run `pnpm install` instead.\x1b[39m\n'
    )
    process.exit(1)
}
