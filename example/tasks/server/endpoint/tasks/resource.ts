import { defineResource, IdNumberParams } from 'bistrio'
import { Prisma, Task } from '@prisma/client'
import { TaskCreateParams, TaskUpdateParams } from '@isomorphic/params'
import { createPrismaEasyDataAccessor, getPrismaCilent } from '@server/lib/prisma-util'

const prisma = getPrismaCilent()

const accessor = createPrismaEasyDataAccessor<Task, IdNumberParams, Prisma.TaskCreateInput, Prisma.TaskUpdateInput>(
  prisma.task,
  'id'
)

export default defineResource((_support, _options) => ({
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
