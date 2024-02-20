import { User } from '@/universal/params'
import { ActionOptions, CreateActionOptionsFunction, buildActionOptions } from 'bistrio'
import createDebug from 'debug'

const debug = createDebug('bistrio:customizer')

export type CustomActionOptions = {
  user?: User
  admin?: {
    id: number
    accessedAt: Date
  }
} & ActionOptions

export const createActionOptions: CreateActionOptionsFunction = (ctx) => {
  debug('createOptions: req.params %s', ctx.params)

  const customActionOptions: CustomActionOptions = buildActionOptions({ user: ctx.req.user })

  if (ctx.params.adminId) {
    customActionOptions.admin = {
      id: Number(ctx.params.adminId),
      accessedAt: new Date(),
    }
  }

  return customActionOptions
}
