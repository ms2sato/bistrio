import { ValidationError } from 'restrant2/client'

export type InvalidState<S = unknown> = {
  error: ValidationError
  source: S
}

export type InvalidStateOrDefaultProps<S = unknown> = {
  error?: ValidationError
  source: S
}

export type StaticProps = {
  invalidState?: InvalidState
  custom?: Record<string, unknown>
}

export type SessionProps = {
  [key: string]: unknown
  __once: StaticProps
}
