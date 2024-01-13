import type ts from 'typescript'
import {
  string,
  function as func,
  any,
  boolean,
  number,
  object,
  promise,
  void as void_,
  instanceof as zinstanceof,
  ZodTypeAny,
} from 'zod'
import { type GetType } from 'zod-to-ts'

// ported from zod-to-ts
// import { withGetType } from 'zod-to-ts'
type ZodToTsOptions = {
  /** @deprecated use `nativeEnums` instead */
  resolveNativeEnums?: boolean
  nativeEnums?: 'identifier' | 'resolve' | 'union'
}
declare const resolveOptions: (raw?: ZodToTsOptions) => {
  resolveNativeEnums?: boolean | undefined
  nativeEnums: 'identifier' | 'resolve' | 'union'
}
type ResolvedZodToTsOptions = ReturnType<typeof resolveOptions>
type GetTypeFunction = (
  typescript: typeof ts,
  identifier: string,
  options: ResolvedZodToTsOptions,
) => ts.Identifier | ts.TypeNode

/**
 * @example
 * // add TypeName 'File' to Schema for z.instanceof(File)
 * const fileSchema = withGetType(zinstanceof(File), (ts) => ts.factory.createIdentifier('File'))
 */
export const withGetType = <T extends ZodTypeAny & GetType>(schema: T, getType: GetTypeFunction): T => {
  if (!('_def' in schema)) {
    throw new Error('schema._def is undefined')
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  schema._def.getType = getType
  return schema
}

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

export const fileSchema = withGetType(zinstanceof(File), (ts) => ts.factory.createIdentifier('File'))

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
