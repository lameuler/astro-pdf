import * as path from 'path'
import { type AstroInlineConfig, build, preview, type PreviewServer } from 'astro'
import PDFParser, { Output } from 'pdf2json'
import { vi } from 'vitest'

export interface TestFixture {
    root: string
    resolveOutput: (p?: string) => string
    build: (config?: AstroInlineConfig) => Promise<void>
    preview: (config?: AstroInlineConfig, restart?: boolean) => Promise<PreviewServer>
    previewUrl: string | undefined
    previewServer: PreviewServer | undefined
}

export async function loadFixture(fixture: string) {
    const root = path.resolve('./test', 'fixtures', fixture)

    const self: TestFixture = {
        root,
        resolveOutput: (p) => path.resolve(root, './dist', p ?? ''),
        build: async (config) =>
            await build({
                logLevel: 'silent',
                mode: 'production',
                ...config,
                // override root and outDir options
                root,
                outDir: self.resolveOutput()
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

export function parsePdf(path: string) {
    const parser = new PDFParser()
    const promise = new Promise<Output>((resolve, reject) => {
        parser.on('pdfParser_dataReady', (data) => {
            resolve(data)
        })
        parser.on('pdfParser_dataError', (err) => {
            reject(err.parserError)
        })
    })
    parser.loadPDF(path)
    return promise
}

export function makeLogger() {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    }
}