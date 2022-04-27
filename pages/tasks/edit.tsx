import 'react'
import { TaskUpdateParams } from '../../params'
import { Form } from './_form'

export function Edit({ task }: { task: TaskUpdateParams }) {
  return (
    <>
      <h2>Update Task</h2>
      <Form action={`/tasks/${task.id}`} method="patch" task={task}></Form>
    </>
  )
}

export { Edit as Page }
