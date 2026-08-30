import { AstroIntegrationLogger } from 'astro'

export type Logger = Pick<AstroIntegrationLogger, 'debug' | 'info' | 'warn' | 'error'>

export function makeLogger(from: AstroIntegrationLogger): Logger {
    const copy = from.fork(from.label)
    copy.info = copy.info.bind(copy.fork(''))
    return copy
}
