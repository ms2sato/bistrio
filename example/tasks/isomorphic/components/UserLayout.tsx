import { Link, Outlet } from 'react-router-dom'
import { useUIEvent, useNavigate } from 'bistrio/client.js'
import { useRenderSupport } from '../../.bistrio/routes/main'
import { FlashMessage } from './FlashMessage'

export default function UserLayout() {
  return (
    <div>
      <Header />
      <FlashMessage />
      <Outlet />
      <footer>for user</footer>
    </div>
  )
}

function Header() {
  const rs = useRenderSupport()
  const user = rs.suspendedResources().auth.user()

  const navigate = useNavigate()
  const { handleEvent: handleLogout, pending } = useUIEvent({
    modifier: () => rs.resources().auth.logout(),
    onSuccess: () => navigate('/', { purge: true }),
  })
  return (
    <header>
      {pending ? (
        '...'
      ) : user.role === -1 ? (
        <Link to="/auth/login">Login</Link>
      ) : (
        <>
          <a href="#" onClick={handleLogout}>
            Logout
          </a>
          {user.username}
        </>
      )}
    </header>
  )
}
