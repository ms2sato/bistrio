import { TaskCreateParams, TaskUpdateParams } from '../../params'

export function Form({
  action,
  method,
  task,
}: {
  action: string
  method: string
  task: TaskCreateParams | TaskUpdateParams
}) {
  return (
    <form action={action} method="post">
      <input type="hidden" name="_method" value={method}></input>
      {'done' in task && (
        <div>
          <input name="done" type="checkbox" value={task.done ? 'checked' : ''}></input>
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
  )
}
