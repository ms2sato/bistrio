import { Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaginationAttrs, useNavigate, usePagination, useUIEvent } from 'bistrio/client'
import { Task } from '@prisma/client'
import { Pagination } from '@/universal/components/Pagination'
import { useRenderSupport } from '@bistrio/routes/main'
import { tasks$show, tasks$edit, tasks$build, tasks$index } from '@bistrio/routes/main/named_endpoints'

export function Index() {
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  return (
    <>
      <h1>{l.t`Task list`}</h1>
      <Link to={tasks$build.path()}>{l.t`Create new task`}</Link>
      <Suspense fallback={<p>{l.t`Loading...`}</p>}>
        <TaskTable></TaskTable>
      </Suspense>
    </>
  )
}

const TaskTable = () => {
  const rs = useRenderSupport()

  const limits = [3, 5, 10]

  const { data: tasks, ...paginationAttrs } = usePagination({
    loader: (pageParams) => rs.suspendedResources().tasks.list(pageParams),
    limit: limits[1],
  })

  const l = rs.getLocalizer()

  return (
    <>
      <PageTool {...paginationAttrs} limits={limits} />
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
      <Pagination {...paginationAttrs} listSize={2} />
    </>
  )
}

function PageTool({ page, maxPage, limit, limits, navigateTolimitChanged }: PaginationAttrs & { limits: number[] }) {
  return (
    <div>
      <span>
        {page} / {maxPage}
      </span>
      <select name="limit" defaultValue={limit} onChange={(ev) => navigateTolimitChanged(Number(ev.target.value))}>
        {limits.map((limitItem) => (
          <option value={limitItem} key={limitItem}>
            {limitItem}
          </option>
        ))}
      </select>
    </div>
  )
}

function TaskRecord({ task: src }: { task: Task }) {
  const [task, setTask] = useState(src)
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  return (
    <tr>
      <td>{task.id}</td>
      <td>
        <DoneSelector task={task} setTask={setTask} />
      </td>
      <td>
        <Link to={tasks$show.path({ id: task.id })}>{task.title}</Link>
      </td>
      <td>{task.description}</td>
      <td>
        <Link to={tasks$edit.path({ id: task.id })}>{l.t`Edit`}</Link>&nbsp;|&nbsp;
        <Remover task={task} />
      </td>
    </tr>
  )
}

function DoneSelector({ task, setTask }: { task: Task; setTask: (task: Task) => void }) {
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  const { handleEvent: handleDoneClick, pending } = useUIEvent({
    modifier: () => rs.resources().tasks.done(task),
    onSuccess: () => setTask({ ...task, done: true }),
  })

  return (
    <>
      {pending ? (
        '...'
      ) : task.done ? (
        l.o('models.tasks.getStatus', task.done)
      ) : (
        <a href="#" onClick={handleDoneClick}>
          {l.o('models.tasks.getStatus', task.done)}
        </a>
      )}
    </>
  )
}

function Remover({ task }: { task: Task }) {
  const navigate = useNavigate()
  const rs = useRenderSupport()
  const l = rs.getLocalizer()

  const { handleEvent: handleDeleteClick, pending } = useUIEvent({
    modifier: () => rs.resources().tasks.destroy(task),
    onSuccess: () => {
      navigate(tasks$index.path(), {
        purge: true,
        flashMessage: { text: `Task deleted '${task.title}'`, type: 'info' },
      })
    },
  })

  return <>{pending ? '...' : <a href="#" onClick={handleDeleteClick}>{l.t`Delete`}</a>}</>
}

export { Index as Page }
