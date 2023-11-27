import { useState } from 'react'
import { z } from 'zod'
import { ValidationError, isValidationError } from './index.js'
import { parseFormBody } from '../parse-form-body.js'
import { createZodTraverseArrangerCreator } from '../create-zod-traverse-arranger-creator.js'

export interface UseSubmitPropEventOptions<O> {
  el: HTMLFormElement
  custom: O
}

export interface UseSubmitProps<
  ZS extends z.AnyZodObject,
  R,
  O = unknown,
  E extends ValidationError = ValidationError,
  S = z.infer<ZS>,
> {
  source: S
  action: {
    modifier: (params: S, options: UseSubmitPropEventOptions<O>) => Promise<R>
    onSuccess?: (result: R, options: UseSubmitPropEventOptions<O>) => void
    onInvalid?: (invalid: E, options: UseSubmitPropEventOptions<O>) => void
    onFatal?: (err: unknown, options: UseSubmitPropEventOptions<O>) => void
  }
  schema: ZS
}

export interface UseSubmitResult<S, R, E extends ValidationError = ValidationError> {
  handleSubmit: React.FormEventHandler<HTMLFormElement>
  attrs: S
  source: S
  invalid: E | null
  result: R | undefined | null
  pending: boolean
}

export function useSubmit<
  ZS extends z.AnyZodObject,
  R,
  O = undefined,
  E extends ValidationError = ValidationError,
  S = z.infer<ZS>,
>(
  { source, action: { modifier, onSuccess, onInvalid, onFatal }, schema }: UseSubmitProps<ZS, R, O, E, S>,
  custom?: O,
): UseSubmitResult<S, R, E> {
  const [attrs, setAttrs] = useState(source)
  const [invalid, setInvalid] = useState<E | null>(null)
  const [result, setResult] = useState<R | undefined | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (ev) => {
    ev.preventDefault()

    if (result === undefined) {
      return false
    }

    const el = ev.currentTarget
    const formData = new FormData(el)
    const formParams = objectFromEntries(formData.entries())

    ;(async () => {
      const newParams = parseFormBody(formParams, createZodTraverseArrangerCreator(schema)) as S

      setInvalid(null)
      setResult(undefined)

      const result = await modifier(newParams, { el, custom: custom as O })
      setAttrs(newParams)
      setResult(result)
      onSuccess && onSuccess(result, { el, custom: custom as O })
    })().catch((err) => {
      setResult(null)
      if (isValidationError(err)) {
        setInvalid(err as E)
        if (onInvalid) {
          onInvalid(err as E, { el, custom: custom as O })
        } else {
          console.error(err)
        }
      } else {
        if (onFatal) {
          onFatal(err, { el, custom: custom as O })
        } else {
          throw err
        }
      }
    })
  }

  return { handleSubmit, attrs, source, invalid, result, pending: result === undefined }
}

function objectFromEntries(entries: IterableIterator<[string, FormDataEntryValue]>) {
  const ret: Record<string, unknown> = {}
  for (const [key, value] of entries) {
    if (key.endsWith('[]')) {
      if (ret[key]) {
        ret[key] = [...(ret[key] as unknown[]), value]
      } else {
        ret[key] = [value]
      }
    } else {
      ret[key] = value
    }
  }
  return ret
}

export type UseEventProps<R, E = unknown> = {
  modifier: (el: Element) => Promise<R>
  onSuccess?: (result: R, el: Element) => void
  onError?: ((err: E, el: Element) => void) | null
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

    const el = ev.currentTarget

    ;(async () => {
      setStatus('pending')

      setResult(undefined)
      setError(null)

      const ret = await modifier(el)
      setStatus('fulfilled')
      setResult(ret)

      onSuccess && onSuccess(ret, el)
    })().catch((err) => {
      setStatus('rejected')
      setResult(undefined)
      setError(err)

      if (onError) {
        onError(err as E, el)
      } else if (onError === undefined) {
        throw err
      }
    })
  }

  return { handleEvent, result, err, pending, status }
}
