import { CreateActionOptionFunction } from 'restrant2'
import createDebug from 'debug'

const debug = createDebug('bistrio:customizer')

export type CustomMethodOption = {
  admin?: {
    id: number
    accessedAt: Date
  }
}

export const createActionOptions: CreateActionOptionFunction = (ctx, _httpPath, _ad) => {
  debug('createOptions: req.params %s', ctx.params)

  const customMethodOption: CustomMethodOption = {}

  if (ctx.params.adminId) {
    customMethodOption.admin = {
      id: Number(ctx.params.adminId),
      accessedAt: new Date(),
    }
  }

  return [customMethodOption]
}
