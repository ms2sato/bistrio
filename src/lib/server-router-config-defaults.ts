import { ActionContextCreator, FileNotFoundError, routerPlaceholderRegex } from '../index.js'
import { ActionContext, CreateActionOptionFunction, InputArranger } from './action-context.js'
import { ActionContextImpl } from './server-router-impl.js'
import { arrangeFormInput, arrangeJsonInput, arrangeOctetStreamInput } from './input-arrangers.js'

type ContentType2Arranger = Record<string, InputArranger>

export const defaultContentType2Arranger: ContentType2Arranger = {
  'application/octet-stream': arrangeOctetStreamInput,
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
      const contentArranger = contentType2Arranger[requestedContentType] || contentType2Arranger['']
      return contentArranger(ctx, sources, schema)
    }
    return contentType2Arranger[''](ctx, sources, schema)
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
