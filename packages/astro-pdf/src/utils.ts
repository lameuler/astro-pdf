import { detectBrowserPlatform, install, resolveBuildId, Browser, type InstallOptions } from '@puppeteer/browsers'
import { createServer, type Server } from 'http'
import handler from 'serve-handler'

export async function installBrowser(options: Partial<InstallOptions>, defaultCacheDir: string) {
    const browser = options.browser ?? Browser.CHROME
    const buildId = options.buildId ?? await resolveBuildId(browser, detectBrowserPlatform(), 'stable')
    const installOptions: InstallOptions = {
        ...options,
        browser,
        buildId,
        cacheDir: options.cacheDir ?? defaultCacheDir
    }
    // cast to any to handle overloading of install (theres probably a better way to do this)
    const installed = await install(installOptions as any)
    return installed.executablePath
}

export function startServer(port: number, dir?: string) {
    const server = createServer((request, response) => {
        return handler(request, response, {
            public: dir
        })
    })
    return new Promise<{ server: Server, port: number }>((resolve, reject) => {
        server.listen(port, undefined, () => {
            const address = server.address()
            if (typeof address === 'string') {
                reject('expected `server.address()` to return AddressInfo, got string instead')
            } else {
                resolve({
                    server,
                    port: address.port
                })
            }
        })
    })
}

export function closeServer(server: Server) {
    return new Promise<void>((resolve, reject) => {
        server.close(err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}