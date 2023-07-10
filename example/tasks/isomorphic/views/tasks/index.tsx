import { Suspense, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import { useUIEvent } from 'bistrio/client'

import { useRenderSupport } from '@bistrio/routes/main'
import { Task } from '@prisma/client'
import { PageParams } from '@/isomorphic/params'

export function Index() {
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  const pageParams = { skip: (currentPage - 1) * 3, take: 3 }

  const handlePrevPageClick = () => {
    startTransition(() => setCurrentPage((currentPage) => currentPage - 1))
  }

  const handleNextPageClick = () => {
    startTransition(() => setCurrentPage((currentPage) => currentPage + 1))
  }

  return (
    <>
      <h1>{l.t`Task list`}</h1>
      <Link to="/tasks/build">{l.t`Create new task`}</Link>
      <Suspense fallback={<p>{l.t`Loading...`}</p>}>
        <TaskTable {...pageParams}></TaskTable>
        <div>
          <a href="#" onClick={() => handlePrevPageClick()} style={currentPage === 1 ? { pointerEvents: 'none' } : {}}>
            Prev
          </a>
          <span>{currentPage}</span>
          <a href="#" onClick={() => handleNextPageClick()}>
            Next
          </a>
          {isPending && '...'}
        </div>
      </Suspense>
    </>
  )
}

const TaskTable = (pageParams: PageParams) => {
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  const tasks = rs.suspendedResources().task.index(pageParams)

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
    modifier: () => rs.resources().task.done(task),
    onSuccess: () => setTask({ ...task, done: true }),
  })

  const { handleEvent: handleDeleteClick, pending: deletePending } = useUIEvent({
    modifier: () => rs.resources().task.destroy(task),
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
      <td>
        <Link to={`/tasks/${task.id}`}>{task.title}</Link>
      </td>
      <td>{task.description}</td>
      <td>
        <Link to={`/tasks/${task.id}/edit`}>{l.t`Edit`}</Link>&nbsp;|&nbsp;
        {deletePending ? '...' : <a href="#" onClick={handleDeleteClick}>{l.t`Delete`}</a>}
      </td>
    </tr>
  )
}

export { Index as Page }
