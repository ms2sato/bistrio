import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageParams, PaginationAttrs, usePageLink } from 'bistrio/client.js'

export function Pagination({
  page,
  maxPage,
  limit,
  listSize,
  prevPageParams,
  nextPageParams,
  prevPageParamsList,
  nextPageParamsList,
}: PaginationAttrs & { listSize: number }) {
  const prevPage = prevPageParams()
  const nextPage = nextPageParams()

  const prevPages = prevPageParamsList(listSize)
  const nextPages = nextPageParamsList(listSize)

  const includeFirst = prevPages.find((p) => p.page === 1)
  const includeSecond = prevPages.find((p) => p.page === 2)

  const includeMax = nextPages.find((p) => p.page === maxPage)
  const includeMaxBefore = nextPages.find((p) => p.page === maxPage - 1)

  return (
    <div>
      {prevPage && (
        <PageLink page={1} limit={limit}>
          &laquo;
        </PageLink>
      )}
      {prevPage && <PageLink {...prevPage}>&lt;</PageLink>}

      {prevPage && !includeFirst && <PageLink page={1} limit={limit} />}
      {prevPage && !includeFirst && !includeSecond && <span>...</span>}

      {prevPages.map((info) => (
        <PageLink {...info} key={info.page} />
      ))}
      {page}
      {nextPages.map((info) => (
        <PageLink {...info} key={info.page} />
      ))}

      {nextPage && !includeMax && !includeMaxBefore && <span>...</span>}
      {nextPage && !includeMax && <PageLink page={maxPage} limit={limit} />}

      {nextPage && <PageLink {...nextPage}>&gt;</PageLink>}
      {nextPage && (
        <PageLink page={maxPage} limit={limit}>
          &raquo;
        </PageLink>
      )}
    </div>
  )
}

function PageLink({ page, limit, children }: PageParams & { children?: ReactNode }) {
  const pageLink = usePageLink()
  const info: PageParams = { page, limit }
  return (
    <Link to={pageLink(info)} preventScrollReset={true} state={info} style={{ padding: '2px' }}>
      {children || page.toString()}
    </Link>
  )
}
