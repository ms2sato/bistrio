export const isError = (err: unknown): err is Error => {
  const error = err as Error
  return 'message' in error && typeof error.message === 'string'
}

export type ErrorWithCode = Error & {
  code: string
}

export const isErrorWithCode = (err: unknown): err is ErrorWithCode => {
  const error = err as ErrorWithCode
  return 'code' in error && typeof error.code === 'string' && isError(err)
}
