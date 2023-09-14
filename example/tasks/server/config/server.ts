import path from 'path'
import { ServerRouterConfig, initServerRouterConfig } from 'bistrio'
import { createActionOptions } from '../customizers/index'
import { pageLoadFunc } from '@isomorphic/config'

// config for Routers in server
export function serverRouterConfig(): ServerRouterConfig {
  return initServerRouterConfig({ baseDir: path.resolve(__dirname, '../'), createActionOptions, pageLoadFunc })
}
