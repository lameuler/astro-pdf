import { Server } from 'node:http'
import { fileURLToPath } from 'node:url'

import { type AstroConfig, preview } from 'astro'
import { ServerOutput } from './options.js'

export async function astroPreview(config: AstroConfig): Promise<ServerOutput> {
    // ** `preview` is an experimental API **
    const server = await preview({ root: fileURLToPath(config.root), logLevel: 'error' })
    // get the actual port number for static preview server
    const address = 'server' in server && server.server instanceof Server ? server.server.address() : undefined
    let host: string | undefined = undefined
    let port: number | undefined = undefined
    if (address && typeof address === 'object') {
        host = address?.address
        port = address?.port
    }
    const url = new URL(`http://${server.host ?? host ?? 'localhost'}:${port ?? server.port}`)
    return {
        url,
        close: server.stop
    }
}
