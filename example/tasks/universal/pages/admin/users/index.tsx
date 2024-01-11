import { useRenderSupport } from '@/.bistrio/routes/admin'
import { adminUserBatchCreateSchema } from '@/universal/params'
import { useSubmit } from 'bistrio/client'

function Page() {
  const rs = useRenderSupport()
  const users = rs.suspendedResources().adminUsers.list()

  return (
    <>
      <h1>Admin/Users</h1>
      <UploadForm />
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
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
    </>
  )
}

function UploadForm() {
  const rs = useRenderSupport()

  const { handleSubmit } = useSubmit({
    source: { file: null },
    action: {
      modifier: (params) => rs.resources().adminUserBatch.create(params),
      onSuccess: (result) => console.log('Success', result),
      onFatal: (err) => console.log('error', err),
    },
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
