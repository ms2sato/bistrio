import * as React from 'react'
import { Form } from './_form'
import { type PageProps } from '../../_types'

function MyForm({ rs }: PageProps) {
  const { id } = rs.params
  if (!id) {
    throw new Error('id not in params')
  }

  const task = rs.suspend(() => rs.resources().api_task.show({ id: Number(id) }), 'api_task_show')

  const props = { task }
  return <Form action={`/tasks/${id}`} method="patch" {...props}></Form>
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
