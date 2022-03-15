import { ServerRouterOption } from 'restrant2'
import { createResourceMethodOptions } from '../customizers'

export function config(): Partial<ServerRouterOption> {
  return { createResourceMethodOptions }
}
