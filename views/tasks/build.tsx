import * as React from 'react'
import { TaskCreateParams } from '../../params'
import { Form } from './_form'

export function Build(props: { task: TaskCreateParams; err?: any }) {
  const handleClick = () => {
    alert('Test!')
  }

  return (
    <div>
      <h2>Create New Task</h2>
      <Form action="/tasks/" method="post" {...props}></Form>
      <button onClick={handleClick}>This is test button</button>
    </div>
  )
}

export { Build as Page }
