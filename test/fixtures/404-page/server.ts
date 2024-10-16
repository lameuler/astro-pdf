import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { extname } from 'path'
import { fileURLToPath } from 'url'

export function start(timeout = 5000) {
    const server = new Server(handleRequest)
    server.listen()
    return new Promise<Server>((resolve, reject) => {
        const tid = setTimeout(() => {
            reject(new Error(`server start timed out in ${timeout}ms`))
        }, timeout)
        server.on('listening', () => {
            clearTimeout(tid)
            resolve(server)
        })
    })
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.url) {
        const url = new URL(req.url, new URL('./public/', import.meta.url))
        const delay = parseInt(url.searchParams.get('delay') || '0')
        const timeout = isFinite(delay) ? delay : 0
        const path = fileURLToPath(url)
        if (!existsSync(path)) {
            res.writeHead(404, 'Not Found!!')
            setTimeout(() => res.end(), timeout)
            return
        }
        try {
            const file = await readFile(path)
            res.writeHead(200)
            switch(extname(path)) {
                case '.html':
                    res.setHeader('Content-Type', 'text/html')
                    break
                case '.svg':
                    res.setHeader('Content-Type', 'image/svg+xml')
                    break
            }
            setTimeout(() => res.end(file.buffer), timeout)
        } catch (err) {
            res.writeHead(500, 'Internal Server Error')
            setTimeout(() => res.end(), timeout)
        }
    }
}