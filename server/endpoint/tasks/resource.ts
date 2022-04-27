import { TaskCreateParams, TaskUpdateParams } from '../../../params'
import { defineResource, IdNumberParams } from 'restrant2'
import { Task } from '../../entities/Task'

export default defineResource((_support, _options) => {
  const tasks: Map<number, Task> = new Map([
    [1, { id: 1, title: 'test1', description: 'test', done: false }],
    [2, { id: 2, title: 'test2', description: 'test', done: false }],
  ])

  let lastId = tasks.size

  const get = (id: number): Task => {
    const task = tasks.get(id)
    if (task === undefined) {
      throw new Error(`Task not found: ${id}`)
    }
    return task
  }

  return {
    index: () => {
      console.log(tasks)
      return Array.from(tasks, ([_id, data]) => data)
    },

    build: (): TaskCreateParams => {
      return { title: '', description: '' }
    },

    create: (params: TaskCreateParams) => {
      console.log(params)
      const task: Task = {
        ...params,
        id: ++lastId,
        done: false,
      }
      tasks.set(task.id, task)
      return task
    },

    edit: (params: IdNumberParams) => {
      console.log(params)
      return get(params.id)
    },

    update: (params: TaskUpdateParams) => {
      console.log(params)
      const { id, ...data } = params
      const task = { ...get(id), ...data }
      tasks.set(id, task)
      return task
    },

    destroy: (params: IdNumberParams) => {
      console.log(params)
      const task = get(params.id)
      tasks.delete(params.id)
      return task
    },

    done: (params: IdNumberParams) => {
      console.log(params)
      const task = get(params.id)
      task.done = true
      return task
    },
  }
})
