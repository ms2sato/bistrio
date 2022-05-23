import * as React from 'react'
import { Form } from './_form'
import { PageProps, getResource } from '../../lib/render-support'
import type ApiTask from '../../server/endpoint/api/tasks/resource'

function MyForm({ rs }: PageProps) {
  const resource = getResource<typeof ApiTask>(rs, 'api_task')
  const task = resource.show({ id: 1 })

  const props = { task }
  return <Form action={`/tasks/${props.task.id}`} method="patch" {...props}></Form>
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
