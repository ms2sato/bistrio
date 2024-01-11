import { existsSync } from 'node:fs'
import { ZodType } from 'zod'
import { ActionContextCreator, SchemaUtil, routerPlaceholderRegex } from '../index.js'
import { FileNotFoundError } from './shared/common.js'
import { LoadFunc } from './server-router-config.js'
import { ActionContext, CreateActionOptionFunction, InputArranger, MutableActionContext } from './action-context.js'
import { createZodTraverseArrangerCreator } from './shared/create-zod-traverse-arranger-creator.js'
import { parseFormBody } from './shared/parse-form-body.js'
import { ActionContextImpl } from './server-router-impl.js'

export function arrangeFormInput(ctx: MutableActionContext, sources: readonly string[], schema: ZodType) {
  return parseFormBody(ctx.mergeInputs(sources), createZodTraverseArrangerCreator(schema))
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

export const importLocal: LoadFunc = async (filePath) => {
  if (process.env.NODE_ENV == 'development') {
    try {
      // for ts-node dynamic import
      return import(filePath)
    } catch (err) {
      if (
        !existsSync(filePath) &&
        !existsSync(`${filePath}.ts`) &&
        !existsSync(`${filePath}.tsx`) &&
        !existsSync(`${filePath}.js`)
      ) {
        throw new FileNotFoundError(`module: '${filePath}' is not found`)
      }
      throw err
    }
  } else {
    if (!filePath.endsWith('.js')) {
      filePath = `${filePath}.js`
    }

    if (!existsSync(filePath)) {
      throw new FileNotFoundError(`module: '${filePath}' is not found`)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await import(filePath)
  }
}
