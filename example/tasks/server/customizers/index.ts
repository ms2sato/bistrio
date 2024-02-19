import { User } from '@/universal/params'
import { ActionOption, CreateActionOptionFunction, buildActionOption } from 'bistrio'
import createDebug from 'debug'

const debug = createDebug('bistrio:customizer')

export type CustomMethodOption = {
  user?: User
  admin?: {
    id: number
    accessedAt: Date
  }
} & ActionOption

export const createActionOptions: CreateActionOptionFunction = (ctx) => {
  debug('createOptions: req.params %s', ctx.params)

  const customMethodOption: CustomMethodOption = buildActionOption({ user: ctx.req.user })

  if (ctx.params.adminId) {
    customMethodOption.admin = {
      id: Number(ctx.params.adminId),
      accessedAt: new Date(),
    }
  }

  return customMethodOption
}
