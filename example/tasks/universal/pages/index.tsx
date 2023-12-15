import { Link } from 'react-router-dom'
import { __tasks } from '@bistrio/routes/main/endpoints'

export function Index() {
  return (
    <>
      <h1>Index</h1>
      <Link to={__tasks.path()}>Tasks</Link>
    </>
  )
}

export { Index as Page }
