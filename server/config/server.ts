import { ServerRouterConfig } from 'restrant2'
import { createOptions } from '../customizers'

// config for Routers in server
export function config(): Partial<ServerRouterConfig> {
  return { createOptions }
}
