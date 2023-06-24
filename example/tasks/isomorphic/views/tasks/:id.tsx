import { useRenderSupport } from '@/.bistrio/routes/main'
import { ErrorPanel } from '@/isomorphic/components/ErrorPanel'
import { commentCreateSchema } from '@/isomorphic/params'
import { useNavigate, useSubmit } from 'bistrio/client'
import { Suspense } from 'react'
import z from 'zod'

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

const taskFormSchem = commentCreateSchema.omit({ taskId: true }).extend({
  id: z.coerce.number().optional(),
})

function TaskCreateForm({ id }: { id: number }) {
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const { handleSubmit, invalid, pending } = useSubmit({
    source: { body: '' },
    action: {
      modifier: (params) => rs.resources().api_task_comment.create({ taskId: id, body: params.body }),
      onSuccess: () => navigate(`/tasks/${id}`, { purge: true }),
    },
    schema: taskFormSchem,
  })

  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={pending}>
          <input name="body"></input>
          <input type="submit"></input>
        </fieldset>
      </form>
    </>
  )
}
