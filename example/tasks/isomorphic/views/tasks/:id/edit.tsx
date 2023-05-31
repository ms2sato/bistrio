import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { UseSubmitProps, ValidationError, useSubmit } from 'bistrio/client'

import { useRenderSupport } from '@bistrio/routes/main'
import { TaskCreateParams, TaskUpdateParams } from '@/isomorphic/params'
import { Task } from '@prisma/client'

function MyForm() {
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const id = Number(rs.params.id)
  const source = rs.suspendedResources().api_task.show({ id })

  const props: UseSubmitProps<TaskUpdateParams, Task> = {
    source,
    action: {
      mutator: (params: TaskUpdateParams): Promise<Task> => rs.resources().api_task.update(params),
      onSuccess: () => navigate(`/tasks`),
    },
  }

  return <Form {...props}></Form>
}

export function Edit() {
  return (
    <>
      <h2>Update Task</h2>
      <React.Suspense fallback={<p>Loading...</p>}>
        <MyForm></MyForm>
      </React.Suspense>
    </>
  )
}

function ErrorPanel({ err }: { err: ValidationError }) {
  console.log(err)
  return (
    <>
      <div>error</div>
      <ul>
        {err.issues.map((er, i) => (
          <li key={i}>
            {er.path.join('.')}: {er.message}
          </li>
        ))}
      </ul>
    </>
  )
}

export function Form<T extends TaskUpdateParams | TaskCreateParams>(props: UseSubmitProps<T, Task>) {
  const { handleSubmit, params, invalid, pending } = useSubmit<T, Task>(props)

  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={pending}>
          {'done' in params && (
            <div>
              <input name="done" type="checkbox" value="true" defaultChecked={params.done || false}></input>
            </div>
          )}

          <div>
            <input name="title" defaultValue={params.title}></input>
          </div>
          <div>
            <textarea name="description" defaultValue={params.description}></textarea>
          </div>
          <input type="submit"></input>
        </fieldset>
      </form>
    </>
  )
}

export { Edit as Page }
