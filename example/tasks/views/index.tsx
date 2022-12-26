import * as React from 'react'
import { Link } from 'react-router-dom'

export function Index() {
  return (
    <>
      <h1>Index</h1>
      <Link to="/tasks/">Tasks</Link>
    </>
  )
}

export { Index as Page }
