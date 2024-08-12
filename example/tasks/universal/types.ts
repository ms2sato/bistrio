import { Task } from '@prisma/client'

export type TaskWithTags = Task & { tags: string[] }
