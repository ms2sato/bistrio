import * as React from 'react'
import { Link } from 'react-router-dom'
import { PageProps } from '@bistrio/routes/main/_types'
import { Form } from './_form'

export function Build({ rs }: PageProps) {
  const handleClick = () => {
    alert('Test!')
  }

  const l = rs.getLocalizer()

  return (
    <div>
      <h2>{l.t`Create new task`}</h2>
      <Form action="/tasks/" method="post" task={{ title: '', description: '' }}></Form>
      <button onClick={handleClick}>This is test button</button>
      <Link to="/tasks">To Top</Link>
    </div>
  )
}

const hydrate = true
export { Build as Page, hydrate }
