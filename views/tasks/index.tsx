import { useContext, Suspense } from 'react'
import { ActionContext } from 'restrant2'
import { Task } from '../../server/entities/Task'
import { RenderSupportContext } from '../../server/customizers/react-ssr'

type Prop = {
  tasks: Task[]
  ctx: ActionContext
}

export function Index(_prop: Prop) {
  return (
    <>
      <h1>Task list</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <MySuspend></MySuspend>
      </Suspense>
      <a href="/tasks/build">create new task</a>
      <Suspense fallback={<p>Loading...</p>}>
        <TaskTable></TaskTable>
      </Suspense>
    </>
  )
}

// TODO: define params and JsonResponder
type TaskRes = { status: string; data: { task: Task } }
type TasksRes = { status: string; data: { tasks: Task[] } }

const MySuspend = () => {
  const ctx = useContext(RenderSupportContext)

  const res = ctx.fetchJson<TaskRes>('http://localhost:3000/tasks/1/edit.json')
  console.log(res)

  const task = res.data.task
  console.log(task)
  return (
    <div>
      {task.title}, {task.description}
    </div>
  )
}

const TaskTable = () => {
  const ctx = useContext(RenderSupportContext)

  const res = ctx.fetchJson<TasksRes>('http://localhost:3000/tasks.json')
  console.log(res)

  const tasks = res.data.tasks
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Done</th>
          <th>Title</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
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
      </tbody>
    </table>
  )
}

export default Index
