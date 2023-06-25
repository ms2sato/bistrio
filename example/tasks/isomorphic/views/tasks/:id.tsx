import { Suspense, forwardRef, useRef } from 'react'
import { UseSubmitProps, useNavigate, useSubmit } from 'bistrio/client'
import { useRenderSupport } from '@/.bistrio/routes/main'
import { ErrorPanel } from '@/isomorphic/components/ErrorPanel'
import { commentCreateSchema } from '@/isomorphic/params'
import { Comment } from '@prisma/client'

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
      <div>{task.description}</div>
      <ul>
        {task.comments.map((comment) => (
          <li key={comment.id}>{comment.body}</li>
        ))}
      </ul>
      <CommentCreateForm id={id} />
    </>
  )
}

function CommentCreateForm({ id }: { id: number }) {
  const ref = useRef<HTMLFormElement>(null)
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const submitProps: CommentSubmitProps = {
    source: { body: '' },
    action: {
      modifier: async ({ body }) => rs.resources().api_task_comment.create({ taskId: id, body }),
      onSuccess: () => {
        ref.current?.reset()
        navigate(`/tasks/${id}`, { purge: true })
      },
    },
    schema: taskFormSchem,
  }

  return <CommentForm submitProps={submitProps} ref={ref}></CommentForm>
}

const taskFormSchem = commentCreateSchema.omit({ taskId: true })
type CommentSubmitProps = UseSubmitProps<typeof taskFormSchem, Comment>
type CommentFormProps = {
  submitProps: CommentSubmitProps
}

const CommentForm = forwardRef<HTMLFormElement, CommentFormProps>(function CommentForm(
  { submitProps }: CommentFormProps,
  ref
) {
  const { handleSubmit, invalid, pending, source } = useSubmit(submitProps)
  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit} ref={ref}>
        <fieldset disabled={pending}>
          <input name="body" defaultValue={source.body} />
          <input type="submit" />
        </fieldset>
      </form>
    </>
  )
})
