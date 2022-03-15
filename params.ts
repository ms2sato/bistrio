import { z } from 'restrant2'

export const idSchema = z.object({
  id: z.number(),
})

export type IdParams = z.infer<typeof idSchema>

const taskCoreProps = {
  title: z.string().min(3).max(255),
  description: z.string().min(3).max(4096),
}

export const taskCreateSchema = z.object(taskCoreProps)

export type TaskCreateParams = z.infer<typeof taskCreateSchema>

export const taskUpdateSchema = z.object({
  id: z.number(),
  ...taskCoreProps,
  done: z.boolean().optional(),
})

export type TaskUpdateParams = z.infer<typeof taskUpdateSchema>
