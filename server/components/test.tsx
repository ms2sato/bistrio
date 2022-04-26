import 'react'
import { Task } from '../entities/Task'

function Test() {
  return <div>ABCEF</div>
}

type Prop = {
  tasks: Task[]
}

export function All({ tasks }: Prop) {
  return (
    <html>
      <body>
        <Test></Test>
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      </body>
    </html>
  )
}
