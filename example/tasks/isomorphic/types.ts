import { Prisma, Task } from "@prisma/client"

const taskWithComments = Prisma.validator<Prisma.TaskArgs>()({
  include: { comments: true },
})

export type TaskWithComments = Prisma.TaskGetPayload<typeof taskWithComments>

export type TaskWithTags = Task & { tags: string[] }