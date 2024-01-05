import { defineResource, opt } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { CommentCreateParams, CommentUpdateParams, TaskIdParams } from '@/universal/params'
import { Comment } from '@prisma/client'
import { TaskComments } from '@bistrio/interfaces'
import { CustomMethodOption } from '@/server/customizers'

const prisma = getPrismaCilent()

export default defineResource(
  (_support, _options) =>
    ({
      list({ taskId }: TaskIdParams): Promise<Comment[]> {
        return prisma.comment.findMany({ where: { taskId } })
      },
      create(data: CommentCreateParams): Promise<Comment> {
        return prisma.comment.create({ data })
      },

      update(params: CommentUpdateParams): Promise<Comment> {
        const { id, ...data } = params
        return prisma.comment.update({ where: { id }, data })
      },
    }) as const satisfies TaskComments<opt<CustomMethodOption>>,
)
