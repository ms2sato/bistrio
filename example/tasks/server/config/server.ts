import path from 'node:path'
import { ServerRouterConfigCustom } from 'bistrio'
import { createActionOptions } from '../customizers/index'
import { pageLoadFunc } from '@isomorphic/config'

// config for Routers in server
export function config(): ServerRouterConfigCustom {
  return { baseDir: path.resolve(__dirname, '../'), createActionOptions, pageLoadFunc }
}
