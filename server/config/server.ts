import { ServerRouterConfig } from 'restrant2'
import { createActionOptions } from '../customizers'
import { createActionContext} from '../customizers/react-ssr'

// config for Routers in server
export function config(): Partial<ServerRouterConfig> {
  return { createActionOptions, createActionContext }
}
