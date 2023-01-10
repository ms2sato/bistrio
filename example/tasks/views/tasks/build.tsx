import * as React from 'react'
import { useRenderSupport } from 'bistrio/client'
import { Link } from 'react-router-dom'
import { Form } from './_form'
import { N2R } from '@bistrio/routes/main/_types'

export function Build() {
  const rs = useRenderSupport<N2R>()
  const handleClick = () => {
    alert('Test!')
  }

  const l = rs.getLocalizer()

  const { source, error } = rs.invalidStateOrDefault({ title: '', description: '' })

  return (
    <div>
      <h2>{l.t`Create new task`}</h2>
      <Form action="/tasks/" method="post" task={source} err={error}></Form>
      <button onClick={handleClick}>This is test button</button>
      <Link to="/tasks">To Top</Link>
    </div>
  )
}

const hydrate = true
export { Build as Page, hydrate }
