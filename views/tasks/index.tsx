import 'react'
import { Task } from '../../server/entities/Task'

type Prop = {
  tasks: Task[]
}

export function Index({ tasks }: Prop) {
  return (
    <>
      <h1>Task list</h1>
      <a href="/tasks/build">create new task</a>
      <table>
        <tr>
          <th>ID</th>
          <th>Done</th>
          <th>Title</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>{task.id}</td>
            <td>{task.done ? 'closed' : <a href={`/tasks/${task.id}/done?_method=post`}>done</a>}</td>
            <td>{task.title}</td>
            <td>{task.description}</td>
            <td>
              <a href={`/tasks/${task.id}/edit`}>edit</a>&nbsp;|&nbsp;
              <a href={`/tasks/${task.id}?_method=destory`}>delete</a>
            </td>
          </tr>
        ))}
      </table>
    </>
  )
}

export { Index as Page }
