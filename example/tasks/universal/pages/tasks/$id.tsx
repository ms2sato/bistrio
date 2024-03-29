import { Suspense, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'

import { UseSubmitProps, useNavigate, useSubmit } from 'bistrio/client'
import { useRenderSupport } from '@bistrio/routes/main'
import { ErrorPanel } from '@/universal/components/ErrorPanel'
import { commentCreateSchema } from '@/universal/params'
import { Comment } from '@prisma/client'
import { tasks$index } from '@/.bistrio/routes/main/named_endpoints'

export function Page() {
  const params = useParams()

  const id = Number(params.id)
  return (
    <Suspense fallback="...">
      <Task id={id} />
      <hr />
      <Suspense fallback={'...'}>
        <Comments taskId={id} />
      </Suspense>
      <CommentCreateForm taskId={id} />
    </Suspense>
  )
}

function Task({ id }: { id: number }) {
  const rs = useRenderSupport()
  const task = rs.suspendedResources().tasks.load({ id })
  return (
    <>
      <h2>
        <Link to={tasks$index.path()}>Task</Link> / {task.title}
      </h2>
      <div>
        tags:
        {task.tags.map((tag) => (
          <span key={tag} style={{ padding: '2px 4px', margin: '2px', backgroundColor: 'lightgray' }}>
            {tag}
          </span>
        ))}
      </div>
      <div>{task.description}</div>
    </>
  )
}

function Comments({ taskId }: { taskId: number }) {
  const rs = useRenderSupport()
  const comments = rs.suspendedResources().taskComments.list({ taskId })
  return (
    <>
      <h3>Comments</h3>
      {comments.length === 0 ? (
        <div>No comments</div>
      ) : (
        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>{comment.body}</li>
          ))}
        </ul>
      )}
    </>
  )
}

function CommentCreateForm({ taskId }: { taskId: number }) {
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const submitProps: CommentSubmitProps = {
    action: async ({ body }) => rs.resources().taskComments.create({ taskId, body }),
    onSuccess: (_result, { custom }) => {
      custom.reset()
      navigate(location.pathname, { purge: true })
    },
    schema: commentFormSchema,
  }

  return <CommentForm submitProps={submitProps}></CommentForm>
}

const commentFormSchema = commentCreateSchema.omit({ taskId: true })

type CommentFormCustom = { reset(): void }
type CommentSubmitProps = UseSubmitProps<typeof commentFormSchema, Comment, CommentFormCustom>
type CommentFormProps = {
  submitProps: CommentSubmitProps
}

function CommentForm({ submitProps }: CommentFormProps) {
  const ref = useRef<HTMLFormElement>(null)
  const { handleSubmit, invalid, pending, source } = useSubmit(submitProps, {
    reset() {
      ref.current?.reset()
    },
  })
  return (
    <>
      {invalid && <ErrorPanel err={invalid}></ErrorPanel>}
      <form onSubmit={handleSubmit} ref={ref}>
        <fieldset disabled={pending}>
          <input name="body" defaultValue={source?.body} />
          <input type="submit" />
        </fieldset>
      </form>
    </>
  )
}
