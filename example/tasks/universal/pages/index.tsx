import { Link } from 'react-router-dom'
import { task$index } from '@bistrio/routes/main/named_endpoints'

export function Index() {
  return (
    <>
      <h1>Index</h1>
      <Link to={task$index.path()}>Tasks</Link>
    </>
  )
}

export { Index as Page }
