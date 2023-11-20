import { z } from 'zod'

export const Role = {
  Unknown: -1,
  Normal: 0,
  Admin: 9,
} as const satisfies {
  [key: string]: number
}

const roleValuSchema = z.union([z.literal(Role.Unknown), z.literal(Role.Normal), z.literal(Role.Admin)])

const userCoreProps = {
  id: z.number(),
  username: z
    .string()
    .min(3)
    .max(255)
    .regex(/^[a-z][a-z0-9]+$/),
  role: roleValuSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
}

export const userSchema = z.object(userCoreProps)
export type User = z.infer<typeof userSchema>

const userCreateProps = {
  username: userCoreProps['username'],
  password: z.string().min(8).max(255),
}

export const userCreateSchema = z.object(userCreateProps)
export type UserCreateParams = z.infer<typeof userCreateSchema>

export const sessionCreateSchema = z.object(userCreateProps)
export type SessionCreateParams = z.infer<typeof sessionCreateSchema>

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
