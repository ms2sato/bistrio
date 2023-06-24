import { Suspense, useRef } from 'react'
import { useNavigate, useSubmit } from 'bistrio/client'
import { useRenderSupport } from '@/.bistrio/routes/main'
import { ErrorPanel } from '@/isomorphic/components/ErrorPanel'
import { commentCreateSchema } from '@/isomorphic/params'

export function Page() {
  return (
    <Suspense fallback="...">
      <TaskWithComments />
    </Suspense>
  )
}

function TaskWithComments() {
  const rs = useRenderSupport()
  const id = Number(rs.params.id)
  const task = rs.suspendedResources().api_task.show({ id })
  return (
    <>
      <h2>{task.title}</h2>
      <ul>
        {task.comments.map((comment) => (
          <li key={comment.id}>{comment.body}</li>
        ))}
      </ul>
      <TaskCreateForm id={id} />
    </>
  )
}

const taskFormSchem = commentCreateSchema.omit({ taskId: true })

function TaskCreateForm({ id }: { id: number }) {
  const ref = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const { handleSubmit, invalid, pending, attrs } = useSubmit({
    source: { body: '' },
    action: {
      modifier: async (attrs) => rs.resources().api_task_comment.create({ taskId: id, body: attrs.body }),
      onSuccess: () => {
        ref.current && (ref.current.value = '')
        navigate(`/tasks/${id}`, { purge: true })
      },
    },
    schema: taskFormSchem,
  })

  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={pending}>
          <input name="body" defaultValue={attrs.body} ref={ref}></input>
          <input type="submit"></input>
        </fieldset>
      </form>
    </>
  )
}
