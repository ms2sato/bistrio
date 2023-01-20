import * as React from 'react'
import { Form } from '../_form'
import { useRenderSupport } from '@bistrio/routes/main'

function MyForm() {
  const rs = useRenderSupport()
  const id = Number(rs.params.id)
  const { source, error } = rs.invalidStateOr(() => rs.suspendedResources().api_task.show({id}))
  return <Form action={`/tasks/${id}`} method="patch" task={source} err={error}></Form>
}

export function Edit() {
  return (
    <>
      <h2>Update Task</h2>
      <React.Suspense fallback={<p>Loading...</p>}>
        <MyForm></MyForm>
      </React.Suspense>
    </>
  )
}

export { Edit as Page }
