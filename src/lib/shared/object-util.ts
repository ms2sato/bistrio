export function filterByKeys(obj: { [key: string]: unknown }, keys: string[]) {
  // @see https://masteringjs.io/tutorials/fundamentals/filter-key
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)))
}

export function filterWithoutKeys(obj: { [key: string]: unknown }, keys: string[]) {
  // @see https://masteringjs.io/tutorials/fundamentals/filter-key
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)))
}

export function toURLSearchParams(obj: Record<string, unknown>): URLSearchParams {
  return new URLSearchParams(obj as Record<string, string>)
}
