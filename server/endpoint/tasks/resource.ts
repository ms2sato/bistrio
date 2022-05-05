import { defineResource, IdNumberParams } from 'restrant2'
import { Prisma, Task } from '@prisma/client'
import { TaskCreateParams, TaskUpdateParams } from '../../../params'
import { createPrismaEasyDataAccessor, getPrismaCilent } from '../../lib/prisma-util'

const prisma = getPrismaCilent()

const accessor = createPrismaEasyDataAccessor<Task, IdNumberParams, Prisma.TaskCreateInput, Prisma.TaskUpdateInput>(
  prisma.task,
  'id'
)

export default defineResource((_support, _options) => {
  return {
    build: (): TaskCreateParams => {
      return { title: '', description: '' }
    },

    create: async (params: TaskCreateParams) => {
      return accessor.create({ ...params, done: false })
    },

    edit: (params: IdNumberParams) => {
      return accessor.get(params)
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
  }
})
