import { defineResource, opt } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { Comment } from '@prisma/client'
import { TaskComments } from '@bistrio/interfaces'
import { CustomMethodOption } from '@/server/customizers'

const prisma = getPrismaCilent()

export default defineResource(
  (_support, _options) =>
    ({
      list({ taskId }): Promise<Comment[]> {
        return prisma.comment.findMany({ where: { taskId } })
      },
      create(data): Promise<Comment> {
        return prisma.comment.create({ data })
      },

      update(params): Promise<Comment> {
        const { id, ...data } = params
        return prisma.comment.update({ where: { id }, data })
      },
    }) as const satisfies TaskComments<opt<CustomMethodOption>>,
)
