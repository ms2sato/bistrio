import { useState } from 'react'
import { ValidationError, isValidationError } from '.'

export interface UseSubmitProps<S, R, E extends ValidationError = ValidationError> {
  source: S
  action: {
    mutator: (params: S) => Promise<R>
    onSuccess?: (result: R) => void
    onInvalid?: (invalid: E) => void
    onFatal?: (err: unknown) => void
  }
}

export interface UseSubmitResult<S, R, E extends ValidationError = ValidationError> {
  handleSubmit: React.FormEventHandler<HTMLFormElement>
  params: S
  invalid: E | null
  result: R | undefined | null
  pending: boolean
}

export function useSubmit<S, R, E extends ValidationError = ValidationError>({
  source,
  action: { mutator, onSuccess, onInvalid, onFatal },
}: UseSubmitProps<S, R, E>): UseSubmitResult<S, R, E> {
  const [params, setParams] = useState(source)
  const [invalid, setInvalid] = useState<E | null>(null)
  const [result, setResult] = useState<R | undefined | null>(null)

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (ev): void => {
    ev.preventDefault()

    const formData = new FormData(ev.currentTarget)
    const formParams = Object.fromEntries(formData.entries())
    const newParams = { ...params, ...formParams }
    setInvalid(null)
    setResult(undefined)

    mutator(newParams)
      .then((result: R) => {
        setParams(newParams)
        setResult(result)
        onSuccess && onSuccess(result)
      })
      .catch((err) => {
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
