import { CacheRecord } from "../client"

export {}

declare global {
  interface Window {
    bistrio: {
      addCache(record: CacheRecord): void
    }
  }
}
