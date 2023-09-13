import { Suspense } from 'react'

import { useNavigate } from 'bistrio/client.js'
import { useRenderSupport } from '@bistrio/routes/main'
import { Form, UseSubmitProps, formSchema } from '@/isomorphic/components/tasks/Form'
import { useParams } from 'react-router-dom'

function MyForm() {
  const navigate = useNavigate()
  const params = useParams()
  const rs = useRenderSupport()
  const id = Number(params.id)
  const source = rs.suspendedResources().task.show({ id })

  const props: UseSubmitProps = {
    source,
    action: {
      modifier: (params) => rs.resources().task.update({ done: false, ...params, id }),
      onSuccess: () => navigate('/tasks', { purge: true }),
    },
    schema: formSchema,
  }

  return <Form {...props}></Form>
}

export function Edit() {
  return (
    <>
      <h2>Update Task</h2>
      <Suspense fallback={<p>Loading...</p>}>
        <MyForm></MyForm>
      </Suspense>
    </>
  )
}

export { Edit as Page }
