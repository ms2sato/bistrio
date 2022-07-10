import { ServerRouterConfig } from 'restrant2'
import { createActionOptions } from '@server/customizers/index'
import { createActionContext } from '@server/customizers/render-support'

// config for Routers in server
export function config(): Partial<ServerRouterConfig> {
  return { createActionOptions, createActionContext }
}
