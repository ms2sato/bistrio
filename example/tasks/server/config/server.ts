import path from 'path'
import { ServerRouterConfigCustom } from 'bistrio'
import { createActionOptions } from '../customizers/index'

// config for Routers in server
export function config(): ServerRouterConfigCustom {
  return { baseDir: path.resolve(__dirname, '../'), createActionOptions }
}
