import { useState } from 'react'
import { useNavigate, useSubmit } from 'bistrio/client'
import { sessionCreateSchema } from '@universal/params'
import { ErrorPanel } from '@universal/components/ErrorPanel'
import { useRenderSupport } from '@bistrio/routes/main'
import { tasks$index } from '@/.bistrio/routes/main/named_endpoints'

export function Page() {
  const rs = useRenderSupport()
  const navigate = useNavigate()
  const [err, setError] = useState<unknown>(undefined)

  const { handleSubmit, invalid } = useSubmit({
    action: (params) => rs.resources().auth.verify(params),
    onSuccess: (result) =>
      navigate(tasks$index.path(), {
        purge: true,
        flashMessage: { text: `Logged in as ${result.username}`, type: 'info' },
      }),
    onFatal: (err) => setError(err),
    schema: sessionCreateSchema,
  })

  return (
    <>
      <h1>Sign in</h1>
      <ErrorPanel err={invalid || err} />
      <form onSubmit={handleSubmit}>
        <section>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required autoFocus />
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
