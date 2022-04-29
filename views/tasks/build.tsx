import 'react'
import { ValidationError } from 'restrant2'
import { TaskCreateParams } from '../../params'
import { Form } from './_form'

export function Build(props: { task: TaskCreateParams; err?: ValidationError }) {
  return (
    <>
      <h2>Create New Task</h2>
      <Form action="/tasks/" method="post" {...props}></Form>
    </>
  )
}

export default Build
