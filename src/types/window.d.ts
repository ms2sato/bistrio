import { CacheRecord } from '../client.js'

export {}

declare global {
  interface Window {
    BISTRIO: {
      cache: { [key: string]: unknown }
      addCache(record: CacheRecord): void
    }
  }
}
