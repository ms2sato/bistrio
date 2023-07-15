import { z } from 'zod'

export const blankSchema = z.object({})
export type BlankParams = z.infer<typeof blankSchema>

export const idNumberSchema = z.object({
  id: z.number(),
})

export type IdNumberParams = z.infer<typeof idNumberSchema>

export type PrimaryKeyParams<T, N extends string = 'id'> = { [P in N]: T }

// for express-fileupload
export const uploadedFileSchema = z.object({
  name: z.string(),
  mv: z.function().args(z.string()).returns(z.promise(z.void())),
  mimetype: z.string(),
  data: z.any(),
  tempFilePath: z.string(),
  truncated: z.boolean(),
  size: z.number(),
  md5: z.string(),
})

export type UploadedFile = z.infer<typeof uploadedFileSchema>

// --- for pagination ---

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
