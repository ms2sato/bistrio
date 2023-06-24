import { Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUIEvent } from 'bistrio/client'

import { useRenderSupport } from '@bistrio/routes/main'
import { Task } from '@prisma/client'

export function Index() {
  const rs = useRenderSupport()
  const l = rs.getLocalizer()
  return (
    <>
      <h1>{l.t`Task list`}</h1>
      <Link to="/tasks/build">{l.t`Create new task`}</Link>
      <Suspense fallback={<p>{l.t`Loading...`}</p>}>
        <TaskTable></TaskTable>
      </Suspense>
    </>
  )
}

const TaskTable = () => {
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  const tasks = rs.suspendedResources().api_task.index()

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
          <TaskRecord key={task.id} task={task} />
        ))}
      </tbody>
    </table>
  )
}

const TaskRecord = ({ task: src }: { task: Task }) => {
  const [task, setTask] = useState(src)
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  const { handleEvent: handleDoneClick, pending: donePending } = useUIEvent({
    modifier: () => rs.resources().api_task.done(task),
    onSuccess: () => setTask({ ...task, done: true }),
  })

  const { handleEvent: handleDeleteClick, pending: deletePending } = useUIEvent({
    modifier: () => rs.resources().api_task.destroy(task),
    onSuccess: () => (location.href = '/tasks'),
  })

  return (
    <tr>
      <td>{task.id}</td>
      <td>
        {donePending ? (
          '...'
        ) : task.done ? (
          l.o('models.tasks.getStatus', task.done)
        ) : (
          <a href="#" onClick={handleDoneClick}>
            {l.o('models.tasks.getStatus', task.done)}
          </a>
        )}
      </td>
      <td><Link to={`/tasks/${task.id}`}>{task.title}</Link></td>
      <td>{task.description}</td>
      <td>
        <Link to={`/tasks/${task.id}/edit`}>{l.t`Edit`}</Link>&nbsp;|&nbsp;
        {deletePending ? '...' : <a href="#" onClick={handleDeleteClick}>{l.t`Delete`}</a>}
      </td>
    </tr>
  )
}

export { Index as Page }
