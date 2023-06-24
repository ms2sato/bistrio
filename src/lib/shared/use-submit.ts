import { useState } from 'react'
import { z } from 'zod'
import { ValidationError, isValidationError } from '.'
import { parseFormBody } from '../parse-form-body'
import { createZodTraverseArrangerCreator } from '../create-zod-traverse-arranger-creator'

export interface UseSubmitProps<
  ZS extends z.AnyZodObject,
  R,
  E extends ValidationError = ValidationError,
  S = z.infer<ZS>
> {
  source: S
  action: {
    modifier: (params: S, ev: React.FormEvent<HTMLFormElement>) => Promise<R>
    onSuccess?: (result: R, ev: React.FormEvent<HTMLFormElement>) => void
    onInvalid?: (invalid: E, ev: React.FormEvent<HTMLFormElement>) => void
    onFatal?: (err: unknown, ev: React.FormEvent<HTMLFormElement>) => void
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

    const el = ev.currentTarget
    const formData = new FormData(el)
    const formParams = Object.fromEntries(formData.entries())

    ;(async () => {
      const newParams = parseFormBody(formParams, createZodTraverseArrangerCreator(schema)) as S

      setInvalid(null)
      setResult(undefined)

      const result = await modifier(newParams, ev)
      setParams(newParams)
      setResult(result)
      onSuccess && onSuccess(result, ev)
    })().catch((err) => {
      setResult(null)
      if (isValidationError(err)) {
        setInvalid(err as E)
        onInvalid && onInvalid(err as E, ev)
      } else {
        if (onFatal) {
          onFatal(err, ev)
        } else {
          throw err
        }
      }
    })
  }

  return { handleSubmit, params, invalid, result, pending: result === undefined }
}

export type UseEventProps<R, E = unknown> = {
  modifier: (ev: React.UIEvent) => Promise<R>
  onSuccess?: (result: R, ev: React.UIEvent) => void
  onError?: ((err: E, ev: React.UIEvent) => void) | null
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

      const ret = await modifier(ev)
      setStatus('fulfilled')
      setResult(ret)

      onSuccess && onSuccess(ret, ev)
    })().catch((err) => {
      setStatus('rejected')
      setResult(undefined)
      setError(err)

      if (onError) {
        onError(err as E, ev)
      } else if (onError === undefined) {
        console.error(err)
      }
    })
  }

  return { handleEvent, result, err, pending, status }
}
