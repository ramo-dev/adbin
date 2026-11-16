export type Runner = (fn: () => Promise<unknown>, ok?: string) => Promise<void>
export type Notify = (text: string, kind?: 'ok' | 'err') => void
