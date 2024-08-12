import { useEffect, useState } from 'react'
import { navigateOptionsKey, useRenderSupport } from '../../client.js'
import { To, useLocation } from 'react-router-dom'

export type DefaultFlashMessageType = 'info' | 'error'
export type NavigateFlashMessageProps<T extends string = DefaultFlashMessageType> = {
  text: string
  type: T
  to?: To | number
}
export type NavigateFlashMessageOptions<T extends string = DefaultFlashMessageType> = {
  flashMessage: NavigateFlashMessageProps<T>
}

export function isNavigateFlashMessageOptions<T extends string = DefaultFlashMessageType>(
  state: unknown,
): state is NavigateFlashMessageOptions<T> {
  if (!state) {
    return false
  }
  const typedState = state as NavigateFlashMessageOptions<T>
  return (
    'flashMessage' in typedState &&
    typedState.flashMessage &&
    !!typedState.flashMessage.text &&
    typeof typedState.flashMessage.text === 'string' &&
    !!typedState.flashMessage.type &&
    typeof typedState.flashMessage.type === 'string'
  )
}

export type DismissFunc = () => void

export function useNavigateFlashMessage<T extends string = DefaultFlashMessageType>(): [
  NavigateFlashMessageProps<T> | undefined,
  DismissFunc,
] {
  const location = useLocation()
  const rs = useRenderSupport()

  const [navigateOptions, setNavigateOptions] = useState<Record<string, unknown>>()

  useEffect(() => {
     
    const newNavigateOptions = rs.suspense.read(navigateOptionsKey) as Record<string, unknown> | undefined
    if (!newNavigateOptions?.flashMessage) {
      setNavigateOptions(newNavigateOptions)
      return
    }

    if (isNavigateFlashMessageOptions<T>(newNavigateOptions)) {
      if (!newNavigateOptions.flashMessage.to) {
        throw new Error('navigateOptions.flashMessage.to is required')
      }

      //https://reactrouter.com/en/main/hooks/use-location
      if (location.pathname !== newNavigateOptions.flashMessage.to) {
        dismiss()
        return
      }
      setNavigateOptions(newNavigateOptions)
    }
  }, [location])

  function dismiss() {
    if (navigateOptions && 'flashMessage' in navigateOptions && navigateOptions.flashMessage) {
      const newNavigateOptions = { ...navigateOptions, flashMessage: undefined }
      rs.suspense.put(navigateOptionsKey, newNavigateOptions)
      setNavigateOptions(newNavigateOptions)
    }
  }
  return [isNavigateFlashMessageOptions<T>(navigateOptions) ? navigateOptions?.flashMessage : undefined, dismiss]
}
