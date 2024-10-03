import * as path from 'path'
import { $ } from 'zx'
import { readFile } from 'fs/promises'
import { type AstroInlineConfig, build, preview } from 'astro'
//const astro = import('astro')

export async function loadFixture(fixture: string) {
    
    const root = path.resolve(process.cwd(), './test', 'fixtures', fixture)
    // console.log(root)
    //const $$ = $({ root })

    return {
        root,
        build: async (config: AstroInlineConfig) => await build({ ...config, root }),
        preview: async (config: AstroInlineConfig) => await preview({ ...config, root })
    }
}