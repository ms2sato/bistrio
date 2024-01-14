import { ZodType } from 'zod'
import { ActionContextCreator, FileNotFoundError, SchemaUtil, routerPlaceholderRegex } from '../index.js'
import { ActionContext, CreateActionOptionFunction, InputArranger, MutableActionContext } from './action-context.js'
import { createZodTraverseArrangerCreator } from './shared/create-zod-traverse-arranger-creator.js'
import { parseFormBody } from './shared/parse-form-body.js'
import { ActionContextImpl } from './server-router-impl.js'
import { LocalFile } from './local-file.js'
import { UploadedFile } from './shared/schemas.js'

export function arrangeFormInput(ctx: MutableActionContext, sources: readonly string[], schema: ZodType) {
  const pred = (input: Record<string, unknown>, source: string) => {
    if (source !== 'files') {
      return input
    }

    const files: Record<string, LocalFile> = {}
    for (const [name, file] of Object.entries(input)) {
      const uploadedFile = file as UploadedFile
      files[name] = new LocalFile(
        uploadedFile.tempFilePath,
        uploadedFile.size,
        uploadedFile.mimetype,
        uploadedFile.name,
      )
    }
    return files
  }

  return parseFormBody(ctx.mergeInputs(sources, pred), createZodTraverseArrangerCreator(schema))
}

export function arrangeJsonInput(ctx: MutableActionContext, sources: readonly string[], schema: ZodType) {
  const pred = (input: Record<string, unknown>, source: string) => {
    return source === 'body' ? input : (SchemaUtil.deepCast(schema, input) as Record<string, unknown>)
  }
  return ctx.mergeInputs(sources, pred)
}

export type ContentArranger = {
  (ctx: MutableActionContext, sources: readonly string[], schema: ZodType): unknown
}

type ContentType2Arranger = Record<string, ContentArranger>

export const defaultContentType2Arranger: ContentType2Arranger = {
  'application/json': arrangeJsonInput,
  'application/x-www-form-urlencoded': arrangeFormInput,
  'multipart/form-data': arrangeFormInput,
  '': arrangeFormInput,
}

export const createSmartInputArranger = (
  contentType2Arranger: ContentType2Arranger = defaultContentType2Arranger,
): InputArranger => {
  return (ctx, sources, schema) => {
    const requestedContentType = ctx.req.headers['content-type']
    if (requestedContentType) {
      for (const [contentType, contentArranger] of Object.entries<ContentArranger>(contentType2Arranger)) {
        if (contentType === '') continue
        if (requestedContentType.indexOf(contentType) >= 0) {
          return contentArranger(ctx, sources, schema)
        }
      }
    }
    return contentType2Arranger[''](ctx, sources, schema) // TODO: overwritable
  }
}

export const createNullActionOption: CreateActionOptionFunction = (_ctx) => {
  return Promise.resolve(undefined)
}

export function renderDefault(ctx: ActionContext, options: unknown = undefined) {
  if (!ctx.descriptor.page) {
    return false
  }

  const viewPath = ctx.httpFilePath.replace(/^\//, '')

  // as object for Express
  ctx.render(viewPath, options as object)
}

export const createDefaultActionContext: ActionContextCreator = ({ router, req, res, descriptor, httpPath }) => {
  return new ActionContextImpl(router, req, res, descriptor, httpPath)
}

export const formatPlaceholderForRouter = (routePath: string) => routePath.replace(routerPlaceholderRegex, ':$1')

export async function importLocal(filePath: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await import(filePath)
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}
