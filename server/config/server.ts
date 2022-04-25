import { ServerRouterConfig } from 'restrant2'
import { createActionOptions } from '../customizers'

// config for Routers in server
export function config(): Partial<ServerRouterConfig> {
  return { createActionOptions }
}
