import * as React from 'react'
import { SchemaUtil, idNumberSchema } from 'restrant2/client'
import { Form } from '../_form'
import { N2R } from '@bistrio/routes/main/_types'
import { useRenderSupport } from 'bistrio/client'

function MyForm() {
  const rs = useRenderSupport<N2R>()
  const params = SchemaUtil.deepCast(idNumberSchema, rs.params)
  const { source, error } = rs.invalidStateOrDefault(rs.suspendedResources().api_task.show(params))
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
