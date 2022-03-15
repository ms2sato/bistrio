import express from 'express'
import { ActionDescriptor } from 'restrant2'
import createDebug from 'debug'

const debug = createDebug('bistrio:customizer')

export type CustomMethodOption = {
  admin?: {
    id: number
    accessedAt: Date
  }
}

export function createResourceMethodOptions(
  req: express.Request,
  res: express.Response,
  httpPath: string,
  ad: ActionDescriptor
): [CustomMethodOption] {
  debug('createResourceMethodOptions: req.params %s', req.params)

  const customMethodOption: CustomMethodOption = {}

  if (req.params.adminId) {
    customMethodOption.admin = {
      id: Number(req.params.adminId),
      accessedAt: new Date(),
    }
  }

  return [customMethodOption]
}
