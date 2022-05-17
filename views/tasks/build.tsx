import * as React from 'react'
import { PageProps } from '../../lib/render-support'
import { Form } from './_form'

export function Build({ rs }: PageProps) {
  const handleClick = () => {
    alert('Test!')
  }

  const l = rs.getLocalizer()

  return (
    <div>
      <h2>{l.t`Hello`}</h2>
      <Form action="/tasks/" method="post" task={{ title: '', description: '' }}></Form>
      <button onClick={handleClick}>This is test button</button>
    </div>
  )
}

export { Build as Page }
