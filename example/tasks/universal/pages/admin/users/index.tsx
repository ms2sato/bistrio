import { useRenderSupport } from '@/.bistrio/routes/admin'
import { adminUserBatchCreateSchema } from '@/universal/params'
import { useSubmit } from 'bistrio/client'
import { Suspense, useState } from 'react'

function Page() {
  const [key, setKey] = useState(new Date().getTime().toString())

  const reload = () => {
    setKey(new Date().getTime().toString())
  }

  return (
    <>
      <h1>Admin/Users</h1>
      <button onClick={reload}>Reload</button>
      <UploadForm reload={reload} />
      <Suspense fallback={<div>...</div>}>
        <UserTable q={key} />
      </Suspense>
    </>
  )
}

function UserTable({ q }: { q: string }) {
  const rs = useRenderSupport()
  const users = rs.suspendedResources().adminUsers.list({ q })

  return (
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users?.map((user) => {
          return (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.role}</td>
              <td></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function UploadForm({ reload }: { reload: () => void }) {
  const rs = useRenderSupport()

  const { handleSubmit } = useSubmit({
    action: (params) => rs.resources().adminUserBatch.create(params),
    onSuccess: (result) => {
      console.log('Success', result)
      reload()
    },
    onFatal: (err) => console.log('error', err),
    schema: adminUserBatchCreateSchema,
  })

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="file">File</label>
      <input type="file" id="file" name="file"></input>
      <button type="submit">Submit</button>
    </form>
  )
}

export { Page }
