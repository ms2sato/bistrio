import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type FlashMessageProps = { text: string; type: 'info' | 'error' }
export type FlashMessageState = { flashMessage: FlashMessageProps }

export function isFlashMessageState(state: unknown): state is FlashMessageState {
  if (!state) {
    return false
  }
  const typedState = state as FlashMessageState
  return (
    'flashMessage' in typedState &&
    typeof typedState.flashMessage.text === 'string' &&
    (typedState.flashMessage.type === 'info' || typedState.flashMessage.type === 'error')
  )
}

type DismissFunc = () => void

export function useFlashMessage(): [FlashMessageProps | undefined, DismissFunc] {
  const location = useLocation()
  const [flashMessage, setFlashMessage] = useState<FlashMessageProps | undefined>(undefined)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const state = location.state
    setFlashMessage(isFlashMessageState(state) ? state.flashMessage : undefined)
  }, [location.state])

  return [
    flashMessage,
    function dismiss() {
      setFlashMessage(undefined)
    },
  ]
}

export function FlashMessage() {
  const [flashMessage, dismiss] = useFlashMessage()
  return flashMessage ? (
    <div onClick={() => dismiss()} className={`flash-message ${flashMessage.type}`}>
      {flashMessage.text}
    </div>
  ) : (
    <></>
  )
}
