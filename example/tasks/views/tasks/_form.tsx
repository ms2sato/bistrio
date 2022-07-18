import * as React from 'react'
import { ValidationError } from 'restrant2/client'
import { TaskCreateParams, TaskUpdateParams } from '@/params'

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

export function Form({
  action,
  method,
  task,
  err,
}: {
  action: string
  method: string
  task: TaskCreateParams | TaskUpdateParams
  err?: ValidationError | undefined
}) {
  return (
    <>
      {err && <ErrorPanel err={err}></ErrorPanel>}
      <form action={action} method="post">
        {/* TODO: CSRF */}
        <input type="hidden" name="_method" value={method}></input>
        {'done' in task && (
          <div>
            <input name="done" type="checkbox" value="true" defaultChecked={task.done || false}></input>
          </div>
        )}

        <div>
          <input name="title" defaultValue={task.title}></input>
        </div>
        <div>
          <textarea name="description" defaultValue={task.description}></textarea>
        </div>
        <input type="submit"></input>
      </form>
    </>
  )
}
