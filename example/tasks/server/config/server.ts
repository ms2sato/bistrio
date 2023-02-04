import { ServerRouterConfig } from 'restrant2'
import { createActionOptions } from '../customizers/index'
import { createActionContext } from '../customizers/render-support'

// config for Routers in server
export function config(): Partial<ServerRouterConfig> {
  return { createActionOptions, createActionContext }
}
