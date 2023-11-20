import { useFlashMessage } from 'bistrio/client'

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
