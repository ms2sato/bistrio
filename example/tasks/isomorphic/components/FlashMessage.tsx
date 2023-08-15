import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type FlashMessageState = { flashMessage: { text: string; type: 'info' | 'error' } }

export function FlashMessage() {
  const location = useLocation()
  const [flashMessage, setFlashMessage] = useState<FlashMessageState['flashMessage'] | undefined>(undefined)

  useEffect(() => {
    if (!location.state || !('flashMessage' in location.state)) {
      setFlashMessage(undefined)
      return
    }

    setFlashMessage((location.state as FlashMessageState).flashMessage)
  }, [location])

  return flashMessage ? <div className={`flash-message ${flashMessage.type}`}>{flashMessage.text}</div> : <></>
}
