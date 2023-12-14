export type PartialWithRequired<T, K extends keyof T> = Pick<T, K> & Partial<T>

export const isArray = <T>(maybeArray: T | readonly T[]): maybeArray is T[] => {
  return Array.isArray(maybeArray)
}
