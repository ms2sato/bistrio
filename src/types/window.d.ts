import { CacheRecord } from '../client'

export {}

declare global {
  interface Window {
    BISTRIO: {
      cache: { [key: string]: unknown }
      addCache(record: CacheRecord): void
    }
  }
}
