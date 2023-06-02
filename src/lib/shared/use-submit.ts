import { useState } from 'react'
import { z } from 'zod'
import { ValidationError, isValidationError } from '.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UseSubmitProps<
  ZS extends z.AnyZodObject,
  R,
  E extends ValidationError = ValidationError,
  S = z.infer<ZS>
> {
  source: S
  action: {
    modifier: (params: S) => Promise<R>
    onSuccess?: (result: R) => void
    onInvalid?: (invalid: E) => void
    onFatal?: (err: unknown) => void
  }
  schema: ZS
}

export interface UseSubmitResult<S, R, E extends ValidationError = ValidationError> {
  handleSubmit: React.FormEventHandler<HTMLFormElement>
  params: S
  invalid: E | null
  result: R | undefined | null
  pending: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSubmit<ZS extends z.AnyZodObject, R, E extends ValidationError = ValidationError, S = z.infer<ZS>>({
  source,
  action: { modifier, onSuccess, onInvalid, onFatal },
  schema,
}: UseSubmitProps<ZS, R, E, S>): UseSubmitResult<S, R, E> {
  const [params, setParams] = useState(source)
  const [invalid, setInvalid] = useState<E | null>(null)
  const [result, setResult] = useState<R | undefined | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault()

    if (result === undefined) {
      return false
    }

    const formData = new FormData(ev.currentTarget)
    const formParams = Object.fromEntries(formData.entries())

    ;(async () => {
      const newParams = schema.parse(formParams) as S

      setInvalid(null)
      setResult(undefined)

      const result = await modifier(newParams)
      setParams(newParams)
      setResult(result)
      onSuccess && onSuccess(result)
    })().catch((err) => {
      setResult(null)
      if (isValidationError(err)) {
        setInvalid(err as E)
        onInvalid && onInvalid(err as E)
      } else {
        if (onFatal) {
          onFatal(err)
        } else {
          throw err
        }
      }
    })
  }

  return { handleSubmit, params, invalid, result, pending: result === undefined }
}

export type UseEventProps<R, E = unknown> = {
  modifier: () => Promise<R>
  onSuccess?: (result: R) => void
  onError?: ((err: E) => void) | null
}

export type UseEventStatus = 'fulfilled' | 'pending' | 'rejected' | null

export function useUIEvent<R, E = unknown>({ modifier, onSuccess, onError }: UseEventProps<R, E>) {
  const [result, setResult] = useState<R | undefined>(undefined)
  const [err, setError] = useState<unknown | null>(null)
  const [status, setStatus] = useState<UseEventStatus>(null)
  const pending = status === 'pending'

  const handleEvent = (ev: React.UIEvent): void => {
    ev.preventDefault()

    if (pending) {
      return
    }

    ;(async () => {
      setStatus('pending')

      setResult(undefined)
      setError(null)

      const ret = await modifier()
      setStatus('fulfilled')
      setResult(ret)

      onSuccess && onSuccess(ret)
    })().catch((err) => {
      setStatus('rejected')
      setResult(undefined)
      setError(err)

      if (onError) {
        onError(err as E)
      } else if (onError === undefined) {
        console.error(err)
      }
    })
  }

  return { handleEvent, result, err, pending, status }
}
