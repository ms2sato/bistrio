import { User } from '@/isomorphic/params'
import { CreateActionOptionFunction } from 'bistrio'
import createDebug from 'debug'

const debug = createDebug('bistrio:customizer')

export type CustomMethodOption = {
  user?: User
  admin?: {
    id: number
    accessedAt: Date
  }
}

export const createActionOptions: CreateActionOptionFunction = (ctx) => {
  debug('createOptions: req.params %s', ctx.params)

  const customMethodOption: CustomMethodOption = { user: ctx.req.user as User } // TODO: typesafe

  if (ctx.params.adminId) {
    customMethodOption.admin = {
      id: Number(ctx.params.adminId),
      accessedAt: new Date(),
    }
  }

  return customMethodOption
}
