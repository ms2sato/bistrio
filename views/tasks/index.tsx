import { Suspense } from 'react'
import { Task } from '../../server/entities/Task'

type Prop = {
  tasks: Task[]
}

export function Index({ tasks }: Prop) {
  return (
    <>
      <h1>Task list</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <MySuspend></MySuspend>
      </Suspense>
      <a href="/tasks/build">create new task</a>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Done</th>
            <th>Title</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{task.id}</td>
              <td>{task.done ? 'closed' : <a href={`/tasks/${task.id}/done?_method=post`}>done</a>}</td>
              <td>{task.title}</td>
              <td>{task.description}</td>
              <td>
                <a href={`/tasks/${task.id}/edit`}>edit</a>&nbsp;|&nbsp;
                <a href={`/tasks/${task.id}?_method=destory`}>delete</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

let counter = 0
let sleepTime = 0
let data: { result: string } | undefined

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchSomething(ms: number) {
  await sleep(ms)
  data = { result: `random: ${Math.random()}` }
  return data
}

const MySuspend = () => {
  counter++
  if (data === undefined) {
    sleepTime = 1000 * ((counter % 3) + 1)
    throw fetchSomething(sleepTime)
  }

  const result = data.result
  data = undefined
  return (
    <p>
      Hello, world! {counter}, waited: {sleepTime}ms: {result}
    </p>
  )
}

// const MySuspend = () => {
//   if (counter++ % 2 == 0) {
//     sleepTime = 1000 * ((counter % 3) + 1)
//     throw fetchSomething(sleepTime)
//   }
//   return (
//     <p>
//       Hello, world! {counter}, waited: {sleepTime}ms
//     </p>
//   )
// }

export default Index
