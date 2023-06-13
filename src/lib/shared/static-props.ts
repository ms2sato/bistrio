export type StaticProps = {
  custom?: Record<string, unknown>
}

export type SessionProps = {
  [key: string]: unknown
  __once: StaticProps
}

export type CacheRecord = { key: string; data: unknown }
