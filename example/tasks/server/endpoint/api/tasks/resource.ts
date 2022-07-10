import { defineResource, IdNumberParams } from 'restrant2'
import { Prisma, Task } from '@prisma/client'
import { createPrismaEasyDataAccessor, getPrismaCilent } from '@server/lib/prisma-util'

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
    return accessor.get(params)
  },
}))
