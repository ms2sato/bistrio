export type StaticProps = {
  custom?: Record<string, unknown>
}

export type SessionProps = {
  [key: string]: unknown
  __once: StaticProps
}
