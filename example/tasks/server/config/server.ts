import { resolve, relative } from 'path'
import { ServerRouterConfig, initServerRouterConfig, FileNotFoundError } from 'bistrio'
import { createActionOptions } from '../customizers/index'
import { ComponentType, lazy } from 'react'

async function importLocal(this: ServerRouterConfig, filePath: string) {
  try {
    const relativePath = relative(resolve(this.baseDir, 'resources'), filePath)
    return require(`../resources/${relativePath}`)
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

function pageLoadFunc(filePath: string) {
  try {
    return lazy(() => {
      const { Page } = require(`../../universal/pages${filePath}`)
      return Promise.resolve({ default: Page as ComponentType<any> })
    })
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

// config for Routers in server
export function serverRouterConfig(): ServerRouterConfig {
  return initServerRouterConfig({
    baseDir: resolve(__dirname, '../'),
    createActionOptions,
    pageLoadFunc,
    importLocal,
  })
}
