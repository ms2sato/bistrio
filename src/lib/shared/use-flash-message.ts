import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type DefaultFlashMessageType = 'info' | 'error'
export type FlashMessageProps<T extends string = DefaultFlashMessageType> = { text: string; type: T }
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
  const [flashMessage, setFlashMessage] = useState<FlashMessageProps<T> | undefined>(undefined)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const state = location.state
    setFlashMessage(isFlashMessageState<T>(state) ? state.flashMessage : undefined)
  }, [location.state])

  return [
    flashMessage,
    function dismiss() {
      setFlashMessage(undefined)
    },
  ]
}
