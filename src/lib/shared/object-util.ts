export function filterByKeys(obj: { [key: string]: unknown }, keys: string[]) {
  // @see https://masteringjs.io/tutorials/fundamentals/filter-key
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)))
}

export function filterWithoutKeys(obj: { [key: string]: unknown }, keys: string[]) {
  // @see https://masteringjs.io/tutorials/fundamentals/filter-key
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)))
}

export function toURLSearchParams(obj: Record<string, unknown>): URLSearchParams {
  const reqParams = new URLSearchParams()
  for (const [key, val] of Object.entries(obj)) {
    reqParams.set(key, JSON.stringify(val))
  }
  return reqParams
}
