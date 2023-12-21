import { union, literal, number, string, date, object, array, coerce } from 'zod'

export const Role = {
  Unknown: -1,
  Normal: 0,
  Admin: 9,
} as const satisfies {
  [key: string]: number
}

const roleValuSchema = union([literal(Role.Unknown), literal(Role.Normal), literal(Role.Admin)])

const userCoreProps = {
  id: number(),
  username: string()
    .min(3)
    .max(255)
    .regex(/^[a-z][a-z0-9]+$/),
  role: roleValuSchema,
  createdAt: date(),
  updatedAt: date(),
}

export const userSchema = object(userCoreProps)
export type User = Zod.infer<typeof userSchema>

const userCreateProps = {
  username: userCoreProps['username'],
  password: string().min(8).max(255),
}

export const userCreateSchema = object(userCreateProps)
export type UserCreateParams = Zod.infer<typeof userCreateSchema>

export const sessionCreateSchema = object(userCreateProps)
export type SessionCreateParams = Zod.infer<typeof sessionCreateSchema>

const taskCoreProps = {
  title: string().min(3).max(255),
  description: string().min(3).max(4096),
}

const withTags = {
  tags: array(string()).optional().default([]),
}

const taskWithTagsCoreProps = {
  ...taskCoreProps,
  ...withTags,
}

export const taskCreateSchema = object(taskCoreProps)
export type TaskCreateParams = Zod.infer<typeof taskCreateSchema>

export const taskCreateWithTagsSchema = object(taskWithTagsCoreProps)
export type TaskCreateWithTagsParams = Zod.infer<typeof taskCreateWithTagsSchema>

export const taskUpdateSchema = object({
  id: number(),
  ...taskCoreProps,
  done: coerce.boolean().default(false), // from view's value is string, change to boolean
})

export type TaskUpdateParams = Zod.infer<typeof taskUpdateSchema>

export const taskUpdateWithTagsSchema = taskUpdateSchema.extend(withTags)
export type TaskUpdateWithTagsParams = Zod.infer<typeof taskUpdateWithTagsSchema>

export const taskIdSchema = object({
  taskId: number(),
})

export type TaskIdParams = Zod.infer<typeof taskIdSchema>

const commentCoreProps = {
  taskId: number(),
  body: string().min(3).max(255),
}

export const commentCreateSchema = object(commentCoreProps)

export type CommentCreateParams = Zod.infer<typeof commentCreateSchema>

export const commentUpdateSchema = object({
  id: number(),
  ...commentCoreProps,
})

export type CommentUpdateParams = Zod.infer<typeof commentUpdateSchema>
