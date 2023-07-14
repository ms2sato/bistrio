import { z } from 'zod'

const pageCoreProps = {
  page: z.number(),
  limit: z.number(),
}

export const pageSchema = z.object(pageCoreProps)
export type PageParams = z.infer<typeof pageSchema>

export type Paginated<E> = {
  data: E[]
  count: number
  params: PageParams
}

const taskCoreProps = {
  title: z.string().min(3).max(255),
  description: z.string().min(3).max(4096),
}

const withTags = {
  tags: z.array(z.string()).optional().default([]),
}

const taskWithTagsCoreProps = {
  ...taskCoreProps,
  ...withTags,
}

export const taskCreateSchema = z.object(taskCoreProps)
export type TaskCreateParams = z.infer<typeof taskCreateSchema>

export const taskCreateWithTagsSchema = z.object(taskWithTagsCoreProps)
export type TaskCreateWithTagsParams = z.infer<typeof taskCreateWithTagsSchema>

export const taskUpdateSchema = z.object({
  id: z.number(),
  ...taskCoreProps,
  done: z.coerce.boolean().default(false), // from view's value is string, change to boolean
})

export type TaskUpdateParams = z.infer<typeof taskUpdateSchema>

export const taskUpdateWithTagsSchema = taskUpdateSchema.extend(withTags)
export type TaskUpdateWithTagsParams = z.infer<typeof taskUpdateWithTagsSchema>

export const taskIdSchema = z.object({
  taskId: z.number(),
})

export type TaskIdParams = z.infer<typeof taskIdSchema>

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
