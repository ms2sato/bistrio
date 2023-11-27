import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useUIEvent, useNavigate } from 'bistrio/client'
import { useRenderSupport } from '../../.bistrio/routes/main'
import { FlashMessage } from './FlashMessage'

export default function UserLayout(): JSX.Element {
  return (
    <div>
      <Suspense fallback={<div>...</div>}>
        <Header />
      </Suspense>
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
      ) : user === null ? (
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
