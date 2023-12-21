import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ServerRouterConfig, initServerRouterConfig } from 'bistrio'
import { loadPage, importLocal } from '../../config/server/imports'
import { createActionOptions } from '../customizers/index'

const __dirname = dirname(fileURLToPath(import.meta.url))

// config for Routers in server
export function serverRouterConfig(): ServerRouterConfig {
  return initServerRouterConfig({
    baseDir: resolve(__dirname, '../'),
    createActionOptions,
    loadPage,
    importLocal,
  })
}
