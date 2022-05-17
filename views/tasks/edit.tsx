import * as React from 'react'
import { ValidationError } from 'restrant2/client'
import { TaskUpdateParams } from '../../params'
import { Form } from './_form'

export function Edit(props: { task: TaskUpdateParams; err?: ValidationError }) {
  return (
    <>
      <h2>Update Task</h2>
      <Form action={`/tasks/${props.task.id}`} method="patch" {...props}></Form>
    </>
  )
}

export { Edit as Page }
