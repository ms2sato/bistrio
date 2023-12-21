import { resolve } from 'node:path'
import { ServerRouterConfig, initServerRouterConfig } from 'bistrio'
import { loadPage, importLocal } from '../../config/server/imports'
import { createActionOptions } from '../customizers/index'

// config for Routers in server
export function serverRouterConfig(): ServerRouterConfig {
  return initServerRouterConfig({
    baseDir: resolve(__dirname, '../'),
    createActionOptions,
    loadPage,
    importLocal,
  })
}
