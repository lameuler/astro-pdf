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

function wait(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout))
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.url) {
        const url = new URL(req.url.replace(/^(\.{0,2}\/)+/, ''), new URL('./public/', import.meta.url))
        const delay = parseInt(url.searchParams.get('delay') || '0')
        const timeout = isFinite(delay) ? delay : 0
        const path = fileURLToPath(url)

        try {
            if (existsSync(path)) {
                const file = await readFile(path, 'utf-8')
                switch (extname(path)) {
                    case '.html':
                        res.setHeader('Content-Type', 'text/html')
                        break
                    case '.svg':
                        res.setHeader('Content-Type', 'image/svg+xml')
                        break
                }
                res.writeHead(200)
                await wait(timeout)
                res.end(file)
            } else {
                res.setHeader('Content-Type', 'text/html')
                res.writeHead(404, 'Not Found!!')
                const errorPage = fileURLToPath(new URL('./public/404.html', import.meta.url))
                if (existsSync(errorPage)) {
                    const file = await readFile(errorPage, 'utf-8')
                    res.write(file)
                } else {
                    res.write('<h1>Page Not Found</h1>')
                }
                await wait(timeout)
                res.end()
            }
        } catch (err) {
            console.log(res.closed, err)
            await wait(timeout)
            res.writeHead(500, 'Internal Server Error')
            res.end()
        }
    }
}
