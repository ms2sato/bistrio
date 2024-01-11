import { string, function as func, any, boolean, number, object, promise, void as void_ } from 'zod'

export const blankSchema = object({})
export type BlankParams = Zod.infer<typeof blankSchema>

export const idNumberSchema = object({
  id: number(),
  format: string().optional(),
})

export type IdNumberParams = Zod.infer<typeof idNumberSchema>

export type PrimaryKeyParams<T, N extends string = 'id'> = { [P in N]: T }

// for express-fileupload
export const uploadedFileSchema = object({
  name: string(),
  mv: func().args(string()).returns(promise(void_())),
  mimetype: string(),
  data: any(),
  tempFilePath: string(),
  truncated: boolean(),
  size: number(),
  md5: string(),
})

export type UploadedFile = Zod.infer<typeof uploadedFileSchema>

// --- for pagination ---

const pageCoreProps = {
  page: number(),
  limit: number(),
  format: string().optional(),
}

export const pageSchema = object(pageCoreProps)
export type PageParams = Zod.infer<typeof pageSchema>

export type Paginated<E> = {
  data: E[]
  count: number
  params: PageParams
}
