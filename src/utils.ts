import { open, type FileHandle } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function openFd(path: string, debug: (message: string) => void, warn: (message: string) => void, signal?: AbortSignal) {
    const ext = extname(path)
    const name = path.substring(0, path.length - ext.length)
    let i = 0
    let fd: FileHandle | null = null
    let p: string = path
    while (fd === null) {
        signal?.throwIfAborted()
        const suffix = i ? '-' + i : ''
        p = name + suffix + ext
        try {
            fd = await open(p, 'wx')
            break
        } catch (err) {
            debug('openFd: ' + err)
            i++
            if (!(err instanceof Error && 'code' in err && err.code === 'EEXIST')) {
                warn(`unexpected error while opening \`${p}\`: ${err}`)
            }
        }
        if (i === 9) {
            warn(`failed to open \`${name}-\${i}${ext}\` 10 times. run with --verbose to check the errors from openFd.`)
        }
    }
    return { fd, path: p }
}

// eslint-disable-next-line n/no-unsupported-features/node-builtins
export async function pipeToFd(stream: ReadableStream<Uint8Array>, fd: FileHandle, signal?: AbortSignal) {
    const writeStream = fd.createWriteStream()
    const reader = stream.getReader()

    try {
        while (true) {
            signal?.throwIfAborted()
            const { value, done } = await reader.read()
            if (done) {
                break
            }
            signal?.throwIfAborted()
            writeStream.write(value)
        }
    } finally {
        writeStream.end()
    }
}

export function pathnameToFilepath(pathname: string, rootDir: string | URL) {
    const root = typeof rootDir === 'string' ? pathToFileURL(resolve(rootDir) + sep) : rootDir

    if (!pathname.startsWith('/') && !pathname.startsWith('\\')) {
        pathname = '/' + pathname
    }

    const url = new URL(pathname, 'file://')

    // ensure root is treated as a directory
    if (!root.pathname.endsWith('/')) {
        root.pathname += '/'
    }

    const location = new URL('.' + url.pathname, root)

    return fileURLToPath(location)
}

export function filepathToPathname(path: string, rootDir: string | URL) {
    const root = typeof rootDir === 'string' ? rootDir : fileURLToPath(rootDir)

    let pathname = relative(root, path)
    if (pathname.startsWith('./') || pathname.startsWith('.\\')) {
        pathname = pathname.substring(1)
    } else if (!pathname.startsWith('.') && !pathname.startsWith('/') && !pathname.startsWith('\\')) {
        pathname = '/' + pathname
    }
    return pathname.replaceAll(sep, '/')
}
