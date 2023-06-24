import { z } from 'zod'

const taskCoreProps = {
  title: z.string().min(3).max(255),
  description: z.string().min(3).max(4096),
}

export const taskCreateSchema = z.object(taskCoreProps)

export type TaskCreateParams = z.infer<typeof taskCreateSchema>

export const taskUpdateSchema = z.object({
  id: z.number(),
  ...taskCoreProps,
  done: z.coerce.boolean().default(false), // from view's value is string, change to boolean
})

export type TaskUpdateParams = z.infer<typeof taskUpdateSchema>

const commentCoreProps = {
  taskId: z.number(),
  body: z.string().min(3).max(255),
}

export const commentCreateSchema = z.object(commentCoreProps)

export type CommentCreateParams = z.infer<typeof commentCreateSchema>

export const commentUpdateSchema = z.object({
  id: z.number(),
  ...commentCoreProps,
})

export type CommentUpdateParams = z.infer<typeof commentUpdateSchema>
