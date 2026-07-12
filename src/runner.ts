import { extname } from 'node:path'

import { blue, bold, dim, green, red, yellow } from 'kleur/colors'
import pMap from 'p-map'

import { Logger } from './logger.js'
import { PageOptions } from './options.js'
import { FatalError, type PageEnv, PageError, type PageOutput, type PageResult } from './page.js'

interface RunnerContext {
    generated: PageOutput[]
    totalCount: number
    logger: Logger
}

interface TaskInfo {
    attempt: number
    maxAttempts: number
    duration: number
}

export interface PageProcessorOpts {
    location: string
    pageOptions: PageOptions
}

export type PageProcessor = (opts: PageProcessorOpts, env: PageEnv) => Promise<PageResult>

export class Runner {
    readonly #context: RunnerContext
    constructor(
        private processor: PageProcessor,
        private env: PageEnv,
        private concurrency: number,
        logger: Logger
    ) {
        this.#context = {
            logger,
            generated: [],
            totalCount: 0
        }
    }
    get generated(): readonly PageOutput[] {
        return this.#context.generated
    }
    async run(queue: PageProcessorOpts[]) {
        this.#context.totalCount += queue.length
        await pMap(queue, (opts) => this.runTask(opts, this.env), {
            concurrency: this.concurrency
        })
    }
    private async runTask(opts: { location: string; pageOptions: PageOptions }, env: PageEnv, attempt = 1) {
        const { pageOptions } = opts
        const maxAttempts = Math.max(pageOptions.maxRetries ?? 0, 0) + 1
        const start = Date.now()
        try {
            const result = await this.processor(opts, env)
            const duration = Date.now() - start
            this.#context.generated.push(result.output)
            this.logSuccess(result, { duration, attempt, maxAttempts })
        } catch (err) {
            const duration = Date.now() - start
            if (err instanceof PageError) {
                if (attempt < maxAttempts) {
                    this.logError(err, { attempt, maxAttempts, duration })
                    await this.runTask(opts, env, attempt + 1)
                } else {
                    this.#context.totalCount--
                    if (pageOptions.throwOnFail) {
                        throw err
                    } else {
                        this.logError(err, { attempt, maxAttempts, duration })
                    }
                }
            } else if (err instanceof FatalError) {
                throw err
            } else {
                // wrap unexpected errors with a more useful message
                throw new Error(
                    `An unexpected error occurred and was not handled by astro-pdf while processing \`${opts.location}\`:\n\n` +
                        String(err) +
                        '\n\nConsider filing a bug report at https://github.com/lameuler/astro-pdf/issues/new/choose\n',
                    { cause: err }
                )
            }
        }
    }
    private logSuccess(result: PageResult, info: TaskInfo) {
        const pathname = result.output.pathname
        const src = result.src ? dim(' ← ' + result.src) : ''
        const attempts = info.attempt > 1 ? dim(this.retryInfo(info)) : ''
        this.#context.logger.info(`${green('▶')} ${result.location}${src}${attempts}`)

        const out = extname(pathname) !== '.pdf' ? yellow(pathname) : pathname
        this.#context.logger.info(
            `  ${blue('└─')} ${dim(`${out} (+${info.duration.toFixed()}ms) (${this.#context.generated.length.toFixed()}/${this.#context.totalCount.toFixed()})`)}`
        )
    }
    private logError(err: PageError, info: TaskInfo) {
        const retryInfo = this.retryInfo(info)
        const attempts = info.attempt < info.maxAttempts ? yellow(retryInfo) : retryInfo
        const src = err.src ? dim(' ← ' + err.src) : ''
        this.#context.logger.info(
            red(`✖︎ ${err.location} (${err.title}) ${dim(`(+${info.duration.toFixed()}ms)`)}${src}${attempts}`)
        )
        const causeStack =
            err.cause instanceof Error && err.cause.stack ? `\n${bold('Caused by:')}\n${err.cause.stack}` : ''
        this.#context.logger.debug(
            bold(red(`error while processing ${err.location}:\n`)) + (err.stack ?? '') + causeStack
        )
    }
    private retryInfo(info: TaskInfo): string {
        return info.maxAttempts > 1 ? ` (${info.attempt.toFixed()}/${info.maxAttempts.toFixed()} attempts)` : ''
    }
}
