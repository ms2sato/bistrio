import { ServerRouterConfig } from 'bistrio'
import { createActionOptions } from '../customizers/index'

// config for Routers in server
export function config(): Partial<ServerRouterConfig> {
  return { createActionOptions }
}
