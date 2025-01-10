import { readFile, stat } from 'node:fs/promises'
import { IncomingMessage, Server, ServerResponse } from 'node:http'
import { extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Redirects {
    [src: string]: {
        dest: string
        code?: number
    }
}

export class TestServer extends Server {
    history: IncomingMessage[]
    constructor(root: URL, redirects?: Redirects) {
        const history: IncomingMessage[] = []
        super(makeHandler(root, redirects ?? {}, history))
        this.history = history
    }
    async start(timeout = 5000) {
        this.listen()
        return new Promise<TestServer>((resolve, reject) => {
            const tid = setTimeout(() => {
                reject(new Error(`server start timed out in ${timeout}ms`))
            }, timeout)
            const onError = (err: Error) => {
                clearTimeout(tid)
                reject(err)
            }
            this.once('listening', () => {
                clearTimeout(tid)
                resolve(this)
                this.off('error', onError)
            })
            this.once('error', onError)
        })
    }
    async stop() {
        return new Promise<void>((resolve, reject) => {
            this.close((err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }
}

export async function start(root: URL, redirects?: Redirects, timeout?: number) {
    const server = new TestServer(root, redirects)
    return await server.start(timeout)
}

function wait(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout))
}

async function isFile(path: string) {
    try {
        const s = await stat(path)
        return s.isFile()
    } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return false
        } else {
            throw err
        }
    }
}

function makeHandler(root: URL, redirects: Redirects, history: IncomingMessage[] = []) {
    return async (req: IncomingMessage, res: ServerResponse) => {
        history.push(req)
        if (req.url) {
            const url = new URL(req.url, 'base://')
            const delay = parseInt(url.searchParams.get('delay') || '0')
            const timeout = isFinite(delay) ? delay : 0

            if (url.pathname in redirects) {
                const redirect = redirects[url.pathname]
                res.setHeader('Location', redirect.dest)
                res.writeHead(redirect.code ?? 302)
                await wait(timeout)
                res.end()
                return
            }

            let status: number | undefined = undefined

            const match = url.pathname.match(/^\/([1-5][0-9][0-9])(?:\.[a-zA-Z0-9-]+)?$/)
            if (match) {
                const s = parseInt(match[1])
                if (isFinite(s)) {
                    status = s
                }
            }

            const path = fileURLToPath(new URL('.' + url.pathname, root))
            try {
                let finalPath: string | null = null
                if (await isFile(path)) {
                    finalPath = path
                } else if (extname(path) === '') {
                    if (path.endsWith(sep)) {
                        if (await isFile(path + 'index.html')) {
                            finalPath = path + 'index.html'
                        } else {
                            const sliced = path.slice(0, -1)
                            if (sliced && !sliced.endsWith(sep) && (await isFile(sliced + '.html'))) {
                                finalPath = sliced + '.html'
                            }
                        }
                    } else {
                        if (await isFile(path + '.html')) {
                            finalPath = path + '.html'
                        } else if (await isFile(path + sep + 'index.html')) {
                            finalPath = path + sep + 'index.html'
                        }
                    }
                }
                if (finalPath) {
                    const file = await readFile(finalPath)
                    switch (extname(finalPath)) {
                        case '.html':
                            res.setHeader('Content-Type', 'text/html')
                            break
                        case '.js':
                            res.setHeader('Content-Type', 'application/javascript')
                            break
                        case '.svg':
                            res.setHeader('Content-Type', 'image/svg+xml')
                            break
                    }
                    res.writeHead(status ?? 200)
                    await wait(timeout)
                    res.end(file)
                } else {
                    res.setHeader('Content-Type', 'text/html')
                    if (status) {
                        res.writeHead(status, '')
                    } else {
                        res.writeHead(404, 'Not Found!!')
                    }
                    const errorPage = fileURLToPath(new URL('./public/404.html', import.meta.url))
                    if (await isFile(errorPage)) {
                        const file = await readFile(errorPage)
                        res.write(file)
                    } else {
                        res.write('<h1>Page Not Found</h1>')
                    }
                    await wait(timeout)
                    res.end()
                }
            } catch {
                await wait(timeout)
                if (status) {
                    res.writeHead(status, '')
                } else {
                    res.writeHead(500, 'Internal Server Error')
                }
                res.end()
            }
        }
    }
}
