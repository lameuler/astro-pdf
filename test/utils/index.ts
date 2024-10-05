import * as path from 'path'
import { type AstroInlineConfig, build, preview, type PreviewServer } from 'astro'

export interface TestFixture {
    root: string
    build: (config?: AstroInlineConfig) => Promise<void>
    preview: (config?: AstroInlineConfig, restart?: boolean) => Promise<PreviewServer>
    previewUrl: string | undefined,
    previewServer: PreviewServer | undefined
}

export async function loadFixture(fixture: string) {
    const root = path.resolve(process.cwd(), './test', 'fixtures', fixture)

    const self: TestFixture = {
        root,
        build: async (config) => await build({
            logLevel: 'silent',
            mode: 'production',
            ...config,
            // override root and outDir options
            root,
            outDir: './dist'
        }),
        preview: async (config, restart = false) => {
            if (self.previewServer) {
                if (restart) {
                    await self.previewServer.closed()
                } else {
                    return self.previewServer
                }
            }
            const server = await preview({
                logLevel: 'silent',
                mode: 'production',
                ...config,
                root
            })
            server.closed().then(() => {
                self.previewServer = undefined
                self.previewUrl = undefined
            })
            self.previewServer = server
            self.previewUrl = (server.host ?? 'http://localhost') + ':' + server.port
            return server
        },
        previewUrl: undefined,
        previewServer: undefined
    }
    return self
}