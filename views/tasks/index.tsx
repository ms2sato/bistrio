import { Suspense } from 'react'
import { ActionContext } from 'restrant2'
import fetch from 'node-fetch'
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

function request(ctx: ActionContext, url: string) {
  console.log('### call request')
  let readerMap: ReaderMap | undefined = requestMap.get(ctx)
  if (!readerMap) {
    readerMap = new Map()
    requestMap.set(ctx, readerMap)
  }

  let reader: Reader | undefined = readerMap.get(url)
  if (!reader) {
    console.log('undefined reader, start fetch')
    reader = wrap(
      fetch(url).then((ret) => {
        return ret.json()
      })
    )
    readerMap.set(url, reader)
  }
  return reader
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
          console.log('read: pending')
          throw suspender
        case 'error':
          console.log('read: err', err)
          throw err
        default:
          return result
      }
    },
  }
}

type Reader = { read: () => any }
type URL = string
type ReaderMap = Map<URL, Reader>
type ActionContextReaderMap = Map<ActionContext, ReaderMap>

const requestMap: ActionContextReaderMap = new Map()

const MySuspend = ({ ctx }: { ctx: ActionContext }) => {
  const reader = request(ctx, 'http://localhost:3000/tasks/1/edit.json')
  const res = reader.read() as Record<string, any>
  console.log(res)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const task = res.data.task as Task
  console.log(task)
  return (
    <div>
      <h3>request on server</h3>
      <div>
        {task.title}, {task.description}
      </div>
    </div>
  )
}

export default Index
