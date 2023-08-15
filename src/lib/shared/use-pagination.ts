import { useLocation, useNavigate } from 'react-router-dom'
import { PageParams } from './schemas'
import { usePager } from './use-pager'
import { toURLSearchParams } from './object-util'
import { useEffect } from 'react'

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

  const { search } = useLocation()
  const query = parseQuery(search)

  const { page, limit, pageParams, setLimit, setPage, prev, next } = usePager({
    limit: getLimit(query, props.limit),
    page: getPage(query, props.page),
  })

  // Rerendering for PageLink clicking
  // @see https://stackoverflow.com/questions/62836374/react-router-does-not-update-component-if-url-parameter-changes
  useEffect(() => {
    setPage(getPage(query, props.page))
    setLimit(getLimit(query, props.limit))
  }, [query.limit, query.page])

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

const getLimit = (query: Record<string, string>, defaultValue: number | undefined) =>
  query.limit ? Number(query.limit) : defaultValue || 25

const getPage = (query: Record<string, string>, defaultValue: number | undefined) =>
  query.page ? Number(query.page) : defaultValue || 1

// @see https://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-a-range-within-the-supp
const range = (start: number, end: number) =>
  Array.from(
    (function* () {
      while (start < end) yield start++
    })(),
  )
