import * as React from 'react'
import { SchemaUtil, idNumberSchema } from 'restrant2/client'
import { Form } from '../_form'
import { type PageProps } from '@bistrio/routes/main/_types'

function MyForm({ rs }: PageProps) {
  const params = SchemaUtil.deepCast(idNumberSchema, rs.params)
  const { source, error } = rs.invalidStateOrDefault(rs.suspendedResources().api_task.show(params))
  return <Form action={`/tasks/${params.id}`} method="patch" task={source} err={error}></Form>
}

export function Edit(props: PageProps) {
  return (
    <>
      <h2>Update Task</h2>
      <React.Suspense fallback={<p>Loading...</p>}>
        <MyForm {...props}></MyForm>
      </React.Suspense>
    </>
  )
}

export { Edit as Page }
