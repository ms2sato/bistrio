import { CacheRecord } from '../client'

export {}

declare global {
  interface Window {
    BISTRIO: {
      addCache(record: CacheRecord): void
    }
  }
}
