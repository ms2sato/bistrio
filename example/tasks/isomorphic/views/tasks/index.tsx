import { ReactNode, Suspense, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

const parseQuery = (search: string) => Object.fromEntries(new URLSearchParams(search).entries())

type PaginationLoader<T> = (pageParams: PageParams) => { data: T; count: number }
type PaginationProps<T> = { page?: number; limit?: number; loader: PaginationLoader<T> }
type PaginationAttrs = {
  page: number
  limit: number
  state: PageParams | null
  maxPage: number
  pageParams: PageParams
  prev: () => void
  next: () => void
  prevPageParams: () => PageParams | null
  nextPageParams: () => PageParams | null
  prevPageParamsList: (length: number) => PageParams[]
  nextPageParamsList: (length: number) => PageParams[]
  setLimit: (limit: number) => void
  setPage: (page: number) => void
  navigateTolimitChanged: (limit: number) => void
}
type PaginationReturn<T> = PaginationAttrs & {
  data: T
}

function usePagination<T>(props: PaginationProps<T>): PaginationReturn<T> {
  const pageLink = usePageLink()
  const navigate = useNavigate()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { search, state: s } = useLocation()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const state: PageParams | null = s // TODO: to safe
  const query = parseQuery(search)

  const { page, limit, pageParams, setLimit, setPage, prev, next } = usePager({
    limit: query.limit ? Number(query.limit) : props.limit || 25,
    page: query.page ? Number(query.page) : props.page || 1,
  })

  // Rerendering for PageLink clicking
  if (state && (page !== state.page || limit !== state.limit)) {
    setPage(state.page)
    setLimit(state.limit)
  }

  const { data, count } = props.loader(pageParams)
  const maxPage = Math.ceil(count / limit)

  const toPageParams = (pages: number[]): PageParams[] => pages.map((page) => ({ ...pageParams, page }))

  const prevPageNums = (length: number): number[] => {
    return range(Math.max(page - length, 1), page)
  }

  const prevPageParamsList = (length: number): PageParams[] => {
    return toPageParams(prevPageNums(length))
  }

  const nextPageNums = (length: number): number[] => {
    return range(Math.min(page + 1, maxPage), Math.min(page + length + 1, maxPage + 1))
  }

  const nextPageParamsList = (length: number) => {
    return toPageParams(nextPageNums(length))
  }

  const prevPageParams = () => (page > 1 ? { ...pageParams, page: page - 1 } : null)
  const nextPageParams = () => (page === maxPage ? null : { ...pageParams, page: page + 1 })

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
    prev,
    next,
    prevPageParams,
    nextPageParams,
    prevPageParamsList,
    nextPageParamsList,
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

  const limits = [3, 5, 10]

  const { data: tasks, ...paginationAttrs } = usePagination({
    loader: (pageParams) => rs.suspendedResources().task.index(pageParams),
    limit: limits[1],
  })

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
      <Pagination {...paginationAttrs} limits={limits} listSize={2} />
    </>
  )
}

function Pagination({
  page,
  maxPage,
  limit,
  limits,
  listSize,
  navigateTolimitChanged,
  prevPageParams,
  nextPageParams,
  prevPageParamsList,
  nextPageParamsList,
}: PaginationAttrs & { limits: number[]; listSize: number }) {
  const handleLimitChange: React.ChangeEventHandler<HTMLSelectElement> = (ev) => {
    navigateTolimitChanged(Number(ev.target.value))
  }

  const prevInfo = prevPageParams()
  const nextInfo = nextPageParams()

  return (
    <div>
      <div>
        <span>
          {page} / {maxPage}
        </span>
        <select name="limit" defaultValue={limit} onChange={handleLimitChange}>
          {limits.map((l) => (
            <option value={l} key={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {prevInfo && <PageLink {...prevInfo}>Prev</PageLink>}
      {prevPageParamsList(listSize).map((info) => (
        <PageLink {...info} key={info.page} />
      ))}
      {nextPageParamsList(listSize).map((info) => (
        <PageLink {...info} key={info.page} />
      ))}
      {nextInfo && <PageLink {...nextInfo}>Next</PageLink>}
    </div>
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
