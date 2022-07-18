import { ValidationError } from 'restrant2/client'

export type InvalidProps = {
  error: ValidationError
  source: unknown
}

export type StaticProps = {
  invalid?: InvalidProps
  custom?: Record<string, unknown>
}
