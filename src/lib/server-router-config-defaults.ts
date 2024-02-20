import { CreateActionOptionsFunction } from './action-context.js'
import { FileNotFoundError, buildActionOptions, routerPlaceholderRegex } from './shared/common.js'
export { createSmartInputArranger } from './input-arrangers.js'

export const createNullActionOptions: CreateActionOptionsFunction = (_ctx) => {
  return Promise.resolve(buildActionOptions({}))
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
