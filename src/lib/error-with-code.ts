export type ErrorWithCode = Error & {
  code: string
}

export const isErrorWithCode = (err: unknown): err is ErrorWithCode => {
  const error = err as ErrorWithCode
  return 'code' in error && typeof error.code === 'string'
}
