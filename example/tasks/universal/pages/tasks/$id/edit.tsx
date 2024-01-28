import { Suspense } from 'react'

import { useNavigate } from 'bistrio/client'
import { useRenderSupport } from '@bistrio/routes/main'
import { Form, UseSubmitProps, formSchema } from '@/universal/components/tasks/Form'
import { useParams } from 'react-router-dom'
import { tasks$index } from '@/.bistrio/routes/main/named_endpoints'

function MyForm() {
  const navigate = useNavigate()
  const params = useParams()
  const rs = useRenderSupport()
  const id = Number(params.id)
  const source = rs.suspendedResources().tasks.load({ id })

  const props: UseSubmitProps = {
    source,
    action: {
      modifier: (params) => rs.resources().tasks.update({ done: false, ...params, id }),
      onSuccess: (result) =>
        navigate(tasks$index.path(), {
          purge: true,
          flashMessage: { text: `Task updated '${result.title}'`, type: 'info' },
        }),
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
