import { defineResource } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { CommentCreateParams, CommentUpdateParams } from '@/isomorphic/params'

const prisma = getPrismaCilent()

export default defineResource((_support, _options) => ({
  create: (data: CommentCreateParams) => {
    return prisma.comment.create({ data })
  },

  update: (params: CommentUpdateParams) => {
    const { id, ...data } = params
    return prisma.comment.update({ where: { id }, data })
  },
}))
