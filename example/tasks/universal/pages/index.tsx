import { Link } from 'react-router-dom'
import { tasks$index } from '@bistrio/routes/main/named_endpoints'

export function Index() {
  return (
    <>
      <h1>Index</h1>
      <Link to={tasks$index.path()}>Tasks</Link>
    </>
  )
}

export { Index as Page }
