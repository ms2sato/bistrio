import { Outlet } from 'react-router-dom'
import { useUIEvent, useNavigate } from 'bistrio/client'
import { useRenderSupport } from '../../.bistrio/routes/main'

export default (
  <div>
    <Header />
    <Outlet />
    <footer>for user</footer>
  </div>
)

function Header() {
  const rs = useRenderSupport()
  const navigate = useNavigate()
  const { handleEvent, pending } = useUIEvent({
    modifier: () => rs.resources().auth.logout(),
    onSuccess: () => navigate('/', { purge: true }),
  })
  return (
    <header>
      {pending ? (
        '...'
      ) : (
        <a href="#" onClick={handleEvent}>
          Logout
        </a>
      )}
    </header>
  )
}
