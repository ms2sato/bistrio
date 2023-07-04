import { defineResource } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { CommentCreateParams, CommentUpdateParams, TaskIdParams } from '@/isomorphic/params'

const prisma = getPrismaCilent()

export default defineResource((_support, _options) => ({
  index: ({ taskId }: TaskIdParams) => prisma.comment.findMany({ where: { taskId } }),
  create: (data: CommentCreateParams) => {
    return prisma.comment.create({ data })
  },

  update: (params: CommentUpdateParams) => {
    const { id, ...data } = params
    return prisma.comment.update({ where: { id }, data })
  },
}))
