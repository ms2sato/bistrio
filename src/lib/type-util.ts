export type ImportError = Error & {
  code: string
}

export const isImportError = (err: unknown): err is ImportError => {
  const error = err as ImportError
  return 'code' in error && typeof error.code === 'string'
}

export type PartialWithRequired<T, K extends keyof T> = Pick<T, K> & Partial<T>
