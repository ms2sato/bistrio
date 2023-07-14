import { ReactNode, Suspense, useState } from 'react'
import { Link, Location, useLocation as useLocationOrg, useNavigate } from 'react-router-dom'
import { toURLSearchParams, useUIEvent } from 'bistrio/client'

import { useRenderSupport } from '@bistrio/routes/main'
import { Task } from '@prisma/client'
import { PageParams } from '@/isomorphic/params'

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

function useLocation(): Location {
  const rs = useRenderSupport()
  return rs.isClient
    ? useLocationOrg()
    : {
        pathname: rs.location.pathname,
        search: rs.location.search,
        hash: rs.location.hash,
        state: undefined,
        key: 'default',
      }
}

const usePager = (props: { page?: number; limit?: number }) => {
  const [page, setPage] = useState(props.page ?? 1)
  const [limit, setLimit] = useState(props.limit ?? 25)
  const pageParams = { page, limit }

  const prev = () => setPage((currentPage) => currentPage - 1)
  const next = () => setPage((currentPage) => currentPage + 1)

  return { page, limit, pageParams, prev, next, setLimit, setPage }
}

function usePageLink() {
  const location = useLocation()
  return (info: PageParams) => `${location.pathname}?${toURLSearchParams(info).toString()}`
}

function usePagination(props: { page?: number; limit?: number }) {
  const pageLink = usePageLink()
  const navigate = useNavigate()
  const rs = useRenderSupport()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { search, state: s } = useLocation()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const state: PageParams | undefined = s // TODO: to safe
  const query = Object.fromEntries(new URLSearchParams(search).entries())

  const { page, limit, pageParams, setLimit, setPage } = usePager({
    limit: query.limit ? Number(query.limit) : props.limit,
    page: query.page ? Number(query.page) : props.page,
  })

  // Rerendering for PageLink clicking
  if (state && (page !== state.page || limit !== state.limit)) {
    setPage(state.page)
    setLimit(state.limit)
  }

  const { data, count } = rs.suspendedResources().task.index(pageParams) // TODO: replacable as loader
  const maxPage = Math.ceil(count / limit)

  const toInfo = (pages: number[]) => pages.map((page) => ({ ...pageParams, page }))

  const prevPageNums = (page: number, length: number): number[] => {
    return range(Math.max(page - length, 1), page)
  }

  const prevPageInfoList = (page: number, length: number): PageParams[] => {
    return toInfo(prevPageNums(page, length))
  }

  const nextPageNums = (page: number, length: number): number[] => {
    return range(Math.min(page + 1, maxPage), Math.min(page + length + 1, maxPage + 1))
  }

  const nextPageInfoList = (page: number, length: number) => {
    return toInfo(nextPageNums(page, length))
  }

  const length = 2
  const prevPages = prevPageInfoList(page, length)
  const nextPages = nextPageInfoList(page, length)
  const prevInfo = page > 1 ? { ...pageParams, page: page - 1 } : null
  const nextInfo = page === maxPage ? null : { ...pageParams, page: page + 1 }

  const navigateTolimitChanged = (limit: number) => {
    const info: PageParams = { page: 1, limit }
    navigate(pageLink(info), { state: info })
  }

  return {
    data,
    page,
    limit,
    state,
    maxPage,
    pageParams,
    prevPages,
    nextPages,
    prevInfo,
    nextInfo,
    setLimit,
    setPage,
    navigateTolimitChanged,
  }
}

// @see https://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-a-range-within-the-supp
const range = (start: number, end: number) =>
  Array.from(
    (function* () {
      while (start < end) yield start++
    })(),
  )

const TaskTable = () => {
  const rs = useRenderSupport()
  const {
    data: tasks,
    page,
    limit,
    maxPage,
    navigateTolimitChanged,
    prevPages,
    nextPages,
    prevInfo,
    nextInfo,
  } = usePagination({ limit: 3, page: 1 })

  const handleLimitChange: React.ChangeEventHandler<HTMLSelectElement> = (ev) => {
    navigateTolimitChanged(Number(ev.target.value))
  }

  const limits = [3, 5, 10]

  const l = rs.getLocalizer()

  return (
    <>
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
      <div>
        <div>
          <span>
            {page} / {maxPage}
          </span>
          <select name="limit" onChange={handleLimitChange}>
            {limits.map((l) => (
              <option value={l} selected={l === limit}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {prevInfo && <PageLink {...prevInfo}>Prev</PageLink>}
        {prevPages.map((info) => (
          <PageLink {...info} key={info.page} />
        ))}
        {nextPages.map((info) => (
          <PageLink {...info} key={info.page} />
        ))}
        {nextInfo && <PageLink {...nextInfo}>Next</PageLink>}
      </div>
    </>
  )
}

function PageLink({ page, limit, children }: PageParams & { children?: ReactNode }) {
  const pageLink = usePageLink()
  const info: PageParams = { page, limit }
  return (
    <Link to={pageLink(info)} preventScrollReset={true} state={info}>
      {children || page.toString()}
    </Link>
  )
}

function TaskRecord({ task: src }: { task: Task }) {
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
