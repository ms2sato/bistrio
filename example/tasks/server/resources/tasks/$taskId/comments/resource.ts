import { defineResource } from 'bistrio'
import { getPrismaClient } from '@server/lib/prisma-util'
import { Comment } from '@prisma/client'
import { TaskCommentsResource } from '@bistrio/resources'
import { CustomMethodOption } from '@/server/customizers'

const prisma = getPrismaClient()

export default defineResource(
  () =>
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
    }) as const satisfies TaskCommentsResource<CustomMethodOption>,
)
