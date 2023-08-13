import { Outlet } from 'react-router-dom'

export default function TaskLayout() {
  return (
    <div>
      <Outlet></Outlet>
      <footer>for task</footer>
    </div>
  )
}
