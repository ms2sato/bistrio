import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useUIEvent, useNavigate } from 'bistrio/client'
import { useRenderSupport } from '@bistrio/routes/main'
import { __auth__login, __root } from '@bistrio/routes/main/endpoints'
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
    onSuccess: () => navigate(__auth__login.path(), { purge: true }),
  })
  return (
    <header>
      {pending ? (
        '...'
      ) : user === null ? (
        <Link to={__auth__login.path()}>Login</Link>
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
