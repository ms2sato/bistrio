import { defineResource, IdNumberParams, PageParams, Paginated } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { TaskCreateWithTagsParams, TaskUpdateWithTagsParams } from '@/universal/params'
import { TaskWithTags } from '@/universal/types'
import { Task } from '@prisma/client'

const prisma = getPrismaCilent()

export default defineResource((_support, _options) => ({
  index: async (params: PageParams): Promise<Paginated<Task>> => {
    return {
      data: await prisma.task.findMany({ skip: (params.page - 1) * params.limit, take: params.limit }),
      count: await prisma.task.count(),
      params,
    }
  },

  show: async (params: IdNumberParams): Promise<TaskWithTags> => {
    const task = await prisma.task.findUniqueOrThrow({ where: params, include: { tags: { include: { tag: true } } } })
    return { ...task, tags: task.tags.map((tag) => tag.tag.label) }
  },

  create: async (params: TaskCreateWithTagsParams) => {
    return prisma.task.create({
      data: {
        ...params,
        done: false,
        tags: {
          create: params.tags.map((tag) => ({
            tag: {
              connectOrCreate: {
                where: { label: tag },
                create: { label: tag },
              },
            },
          })),
        },
      },
    })
  },

  update: async (params: TaskUpdateWithTagsParams) => {
    const tags = await prisma.tagsOnTask.findMany({ where: { taskId: params.id }, include: { tag: true } })
    const originalTagLabels = tags.map((tag) => tag.tag.label)
    const tagLabelsForCreate = params.tags.filter((tag) => !originalTagLabels.includes(tag))
    const tagsForDelete = tags.filter((tag) => !params.tags.includes(tag.tag.label))

    return prisma.$transaction(async (prisma) => {
      const updated = await prisma.task.update({
        where: { id: params.id },
        data: {
          ...params,
          tags: {
            create: tagLabelsForCreate.map((tag) => ({
              tag: {
                connectOrCreate: {
                  where: { label: tag },
                  create: { label: tag },
                },
              },
            })),
          },
        },
      })

      await prisma.tagsOnTask.deleteMany({
        where: { taskId: params.id, tagId: { in: tagsForDelete.map((tag) => tag.tagId) } },
      })

      return updated
    })
  },

  destroy: async ({ id }: IdNumberParams) => await prisma.task.delete({ where: { id } }),

  done: async ({ id }: IdNumberParams) => await prisma.task.update({ where: { id }, data: { done: true } }),
}))
