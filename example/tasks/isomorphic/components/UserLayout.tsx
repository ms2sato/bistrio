import { Outlet } from 'react-router-dom'

export default function UserLayout() {
  return (
    <div>
      <Outlet></Outlet>
      <footer>for user</footer>
    </div>
  )
}
