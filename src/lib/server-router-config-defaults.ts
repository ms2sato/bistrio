import { ActionContext, CreateActionOptionFunction } from './action-context.js'
import { FileNotFoundError, routerPlaceholderRegex } from './shared/common.js'
export { createSmartInputArranger } from './input-arrangers.js'

export const createNullActionOption: CreateActionOptionFunction = (_ctx) => {
  return Promise.resolve(undefined)
}

export const renderDefault = async (ctx: ActionContext) => {
  if (!ctx.descriptor.page) {
    return false
  }

  await ctx.renderRequestedView()
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
