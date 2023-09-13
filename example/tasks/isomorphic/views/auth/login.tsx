import { useState } from 'react'
import { useNavigate, useSubmit } from 'bistrio/client.js'
import { sessionCreateSchema } from '@isomorphic/params'
import { ErrorPanel } from '@isomorphic/components/ErrorPanel'
import { useRenderSupport } from '@bistrio/routes/main'

export function Page() {
  const rs = useRenderSupport()
  const navigate = useNavigate()
  const [err, setError] = useState<unknown>(undefined)

  const { handleSubmit, source, invalid } = useSubmit({
    source: { username: '', password: '' },
    action: {
      modifier: (params) => rs.resources().auth.verify(params),
      onSuccess: (result) =>
        navigate('/tasks', { purge: true, flashMessage: { text: `Logged in as ${result.username}`, type: 'info' } }),
      onFatal: (err) => setError(err),
    },
    schema: sessionCreateSchema,
  })

  return (
    <>
      <h1>Sign in</h1>
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
