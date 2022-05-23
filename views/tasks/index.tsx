import * as React from 'react'
import { Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Task } from '@prisma/client'
import { PageProps } from '../../lib/render-support'

export function Index({ rs }: PageProps) {
  const l = rs.getLocalizer()
  return (
    <>
      <h1>{l.t`Task list`}</h1>
      <Link to="/tasks/build">{l.t`Create new task`}</Link>
      <Suspense fallback={<p>{l.t`Loading...`}</p>}>
        <TaskTable rs={rs}></TaskTable>
      </Suspense>
    </>
  )
}

// TODO: define params and JsonResponder
type TasksRes = { status: string; data: Task[] }

const TaskTable = ({ rs }: PageProps) => {
  const l = rs.getLocalizer()
  const res = rs.fetchJson<TasksRes>('http://localhost:3000/api/tasks')

  const tasks = res.data
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>{l.o('models.tasks.done')}</th>
          <th>Title</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>{task.id}</td>
            <td>
              {task.done ? (
                l.o('models.tasks.getStatus', task.done)
              ) : (
                <a href={`/tasks/${task.id}/done?_method=post`}>{l.o('models.tasks.getStatus', task.done)}</a>
              )}
            </td>
            <td>{task.title}</td>
            <td>{task.description}</td>
            <td>
              <a href={`/tasks/${task.id}/edit`}>{l.t`Edit`}</a>&nbsp;|&nbsp;
              <a href={`/tasks/${task.id}?_method=delete`}>{l.t`Delete`}</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export { Index as Page }
