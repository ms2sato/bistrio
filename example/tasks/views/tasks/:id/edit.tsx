import * as React from 'react'
import { SchemaUtil, idNumberSchema } from 'restrant2/client'
import { Form } from '../_form'
import { useRenderSupport } from '@bistrio/routes/main'

function MyForm() {
  const rs = useRenderSupport()
  const params = SchemaUtil.deepCast(idNumberSchema, rs.params)
  const { source, error } = rs.invalidStateOr(() => rs.suspendedResources().api_task.show(params))
  return <Form action={`/tasks/${params.id}`} method="patch" task={source} err={error}></Form>
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
