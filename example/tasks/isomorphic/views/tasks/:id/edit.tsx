import { Suspense } from 'react'
import { useNavigate } from 'react-router-dom'

import { useRenderSupport } from '@bistrio/routes/main'
import { Form, UseSubmitProps, formSchema } from '@/isomorphic/components/tasks/Form'

function MyForm() {
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const id = Number(rs.params.id)
  const source = rs.suspendedResources().api_task.show({ id })

  const props: UseSubmitProps = {
    source,
    action: {
      modifier: (params) => rs.resources().api_task.update({ done: false, ...params, id }),
      onSuccess: () => navigate(`/tasks`),
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
