declare const __VERSION__: string | undefined

function placeholder(): string {
    if (process.env.NODE_ENV === 'test') {
        return '[test placeholder]'
    } else {
        throw new Error('running ts files directly is only allowed for testing')
    }
}

export const VERSION = typeof __VERSION__ === 'undefined' ? placeholder() : __VERSION__
