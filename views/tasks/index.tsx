import { Suspense } from 'react'
import { ActionContext } from 'restrant2'
import { Task } from '../../server/entities/Task'

type Prop = {
  tasks: Task[]
  ctx: ActionContext
}

export function Index({ tasks, ctx }: Prop) {
  return (
    <>
      <h1>Task list</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <MySuspend ctx={ctx}></MySuspend>
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchSomething(ms: number) {
  await sleep(ms)
  return { result: `random: ${Math.random()}` }
}

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
function wrap<T>(promise: Promise<T>): { read: () => T } {
  let status = 'pending'
  let result: T
  let err: Error
  const suspender = promise.then(
    (ret) => {
      status = 'success'
      result = ret
    },
    (e: Error) => {
      status = 'error'
      err = e
    }
  )
  return {
    read: () => {
      switch (status) {
        case 'pending':
          throw suspender
        case 'error':
          throw err
        default:
          return result
      }
    },
  }
}

const requestMap = new Map<ActionContext, { read: () => any }>()

const MySuspend = ({ ctx }: { ctx: ActionContext }) => {
  counter++

  let reader = requestMap.get(ctx)
  if (!reader) {
    reader = wrap(fetchSomething(sleepTime))
    requestMap.set(ctx, reader)
  }

  sleepTime = 1000 * ((counter % 3) + 1)
  const ret = reader.read() as { result: string }
  requestMap.delete(ctx)
  console.log(requestMap)

  return (
    <div>
      Hello, world! {counter}, waited: {sleepTime}ms: {ret.result}
    </div>
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
