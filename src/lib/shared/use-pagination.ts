import { useLocation, useNavigate } from 'react-router-dom'
import { PageParams } from './schemas'
import { usePager } from './use-pager'
import { toURLSearchParams } from './object-util'

export function usePageLink() {
  const location = useLocation()
  return (info: PageParams) => `${location.pathname}?${toURLSearchParams(info).toString()}`
}

const parseQuery = (search: string) => Object.fromEntries(new URLSearchParams(search).entries())

export type PaginationLoader<T> = (pageParams: PageParams) => { data: T; count: number }
export type PaginationProps<T> = { page?: number; limit?: number; loader: PaginationLoader<T> }
export type PaginationAttrs = {
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

export type PaginationReturn<T> = PaginationAttrs & {
  data: T
}

export function usePagination<T>(props: PaginationProps<T>): PaginationReturn<T> {
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
    return page === maxPage ? [] : range(Math.min(page + 1, maxPage), Math.min(page + length + 1, maxPage + 1))
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
