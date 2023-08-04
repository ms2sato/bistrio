import { useState } from 'react'
import { useSubmit } from 'bistrio/client'
import { sessionCreateSchema } from '@isomorphic/params'
import { ErrorPanel } from '@isomorphic/components/ErrorPanel'
import { useRenderSupport } from '@bistrio/routes/main'

export function Page() {
  const rs = useRenderSupport()
  const [err, setError] = useState<unknown>(undefined)

  const { handleSubmit, source, invalid } = useSubmit({
    source: { username: '', password: '' },
    action: {
      modifier: (params) => rs.resources().auth.verify(params),
      onFatal: (err) => setError(err),
    },
    schema: sessionCreateSchema,
  })

  return (
    <>
      <h1>Sign in</h1>
      <UserProfile />
      <ErrorPanel err={invalid || err} />
      <form onSubmit={handleSubmit}>
        <section>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={source.username}
            autoComplete="username"
            required
            autoFocus
          />
        </section>
        <section>
          <label htmlFor="current-password">Password</label>
          <input id="current-password" name="password" type="password" autoComplete="current-password" required />
        </section>
        <button type="submit">Sign in</button>
      </form>
    </>
  )
}

function UserProfile() {
  const rs = useRenderSupport()
  const user = rs.suspendedResources().auth.user()
  console.log(user)

  return <div>{user?.username}</div>
}
