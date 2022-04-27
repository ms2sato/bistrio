import 'react'
import { TaskCreateParams } from '../../params'
import { Form } from './_form'

export function Build({ task }: { task: TaskCreateParams }) {
  return (
    <>
      <h2>Create New Task</h2>
      <Form action="/tasks/" method="post" task={task}></Form>
    </>
  )
}

export { Build as Page }
