import 'react'
import { Task } from '../../server/entities/Task'

function Test() {
  return <div>ABCEF</div>
}

type Prop = {
  tasks: Task[]
}

export function Index({ tasks }: Prop) {
  return (
    <>
      <Test></Test>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </>
  )
}

export { Index as Page }