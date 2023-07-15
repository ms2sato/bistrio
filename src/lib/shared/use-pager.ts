import { useState } from 'react'

export const usePager = (props: { page?: number; limit?: number }) => {
  const [page, setPage] = useState(props.page ?? 1)
  const [limit, setLimit] = useState(props.limit ?? 25)
  const pageParams = { page, limit }

  const prev = () => setPage((currentPage) => currentPage - 1)
  const next = () => setPage((currentPage) => currentPage + 1)

  return { page, limit, pageParams, prev, next, setLimit, setPage }
}
