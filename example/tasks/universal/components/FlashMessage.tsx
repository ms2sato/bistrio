import { useNavigateFlashMessage } from 'bistrio/client'

export function FlashMessage() {
  const [flashMessage, dismiss] = useNavigateFlashMessage()
  return flashMessage ? (
    <div onClick={() => dismiss()} className={`flash-message ${flashMessage.type}`}>
      {flashMessage.text}
    </div>
  ) : (
    <></>
  )
}
