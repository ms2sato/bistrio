import { useEffect, useState } from 'react'
import { navigateOptionsKey, useRenderSupport } from '../../client.js'
import { useLocation } from 'react-router-dom'

export type DefaultFlashMessageType = 'info' | 'error'
export type FlashMessageProps<T extends string = DefaultFlashMessageType> = { text: string; type: T; to?: string }
export type FlashMessageState<T extends string = DefaultFlashMessageType> = { flashMessage: FlashMessageProps<T> }

export function isFlashMessageState<T extends string = DefaultFlashMessageType>(
  state: unknown,
): state is FlashMessageState<T> {
  if (!state) {
    return false
  }
  const typedState = state as FlashMessageState<T>
  return (
    'flashMessage' in typedState &&
    typedState.flashMessage &&
    typeof typedState.flashMessage.text === 'string' &&
    typeof typedState.flashMessage.type === 'string'
  )
}

export type DismissFunc = () => void

export function useFlashMessage<T extends string = DefaultFlashMessageType>(): [
  FlashMessageProps<T> | undefined,
  DismissFunc,
] {
  const location = useLocation()
  const rs = useRenderSupport()

  const [navigateOptions, setNavigateOptions] = useState<Record<string, unknown>>()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const newNavigateOptions = rs.suspense.read(navigateOptionsKey) as Record<string, unknown> | undefined
    if (!newNavigateOptions?.flashMessage) {
      return
    }

    if (isFlashMessageState<T>(newNavigateOptions)) {
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
    if (navigateOptions && 'flashMessage' in navigateOptions) {
      // For state.flashMessage required, not to be optional.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      setNavigateOptions({ ...navigateOptions, flashMessage: undefined })
    }
  }
  return [isFlashMessageState<T>(navigateOptions) ? navigateOptions?.flashMessage : undefined, dismiss]
}
