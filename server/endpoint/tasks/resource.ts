import { defineResource, IdNumberParams } from 'restrant2'
import { PrismaClient } from '@prisma/client'
import { TaskCreateParams, TaskUpdateParams } from '../../../params'
import createDebug from 'debug'

const log = createDebug('bistrio:sql')

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
})

prisma.$on('query', ({ query, params }) => {
  log('%s %s', query, params)
})

export default defineResource((_support, _options) => {
  const get = async (id: number) => {
    return await prisma.task.findUnique({ where: { id }, rejectOnNotFound: true })
  }

  return {
    index: async () => {
      return await prisma.task.findMany()
    },

    build: (): TaskCreateParams => {
      return { title: '', description: '' }
    },

    create: async (params: TaskCreateParams) => {
      console.log(params)
      const task = await prisma.task.create({
        data: { ...params, done: false },
      })
      return task
    },

    edit: (params: IdNumberParams) => {
      console.log(params)
      return get(params.id)
    },

    update: async (params: TaskUpdateParams) => {
      console.log(params)
      const { id, ...data } = params
      const task = await prisma.task.update({
        where: { id },
        data,
      })
      return task
    },

    destroy: async ({ id }: IdNumberParams) => {
      await prisma.task.delete({
        where: { id },
      })
    },

    done: async ({ id }: IdNumberParams) => {
      await prisma.task.update({ where: { id }, data: { done: true } })
    },
  }
})
