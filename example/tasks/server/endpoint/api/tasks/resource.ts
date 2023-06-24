import { defineResource, IdNumberParams } from 'bistrio'
import { Prisma, Task } from '@prisma/client'
import { createPrismaEasyDataAccessor, getPrismaCilent } from '@server/lib/prisma-util'
import { TaskCreateParams, TaskUpdateParams } from '@/isomorphic/params'
import { TaskWithComments } from '@/isomorphic/types'

const prisma = getPrismaCilent()

const accessor = createPrismaEasyDataAccessor<Task, IdNumberParams, Prisma.TaskCreateInput, Prisma.TaskUpdateInput>(
  prisma.task,
  'id'
)

export default defineResource((_support, _options) => ({
  index: async () => {
    return accessor.list()
  },

  show: async (params: IdNumberParams) => {
    return accessor.get<TaskWithComments>(params, { include: { comments: true } })
  },

  create: async (params: TaskCreateParams) => {
    return accessor.create({ ...params, done: false })
  },

  update: async (params: TaskUpdateParams) => {
    return accessor.update(params)
  },

  destroy: async (params: IdNumberParams) => {
    return accessor.destroy(params)
  },

  done: async ({ id }: IdNumberParams) => {
    await prisma.task.update({ where: { id }, data: { done: true } })
  },
}))
