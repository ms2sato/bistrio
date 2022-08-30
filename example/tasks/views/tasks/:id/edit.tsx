import * as React from 'react'
import { SchemaUtil, idNumberSchema } from 'restrant2/client'
import { Form } from '../_form'
import { type PageProps } from '@bistrio/routes/main/_types'
import { TaskUpdateParams } from '@/params'

function MyForm({ rs }: PageProps) {
  const params = SchemaUtil.deepCast(idNumberSchema, rs.params)
  const { source, error } = rs.invalid || {
    source: rs.suspend(() => rs.resources().api_task.show(params), 'api_task_show'),
  }

  return <Form action={`/tasks/${params.id}`} method="patch" task={source as TaskUpdateParams} err={error}></Form>
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
