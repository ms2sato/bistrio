import { resolve } from 'path'
import { ServerRouterConfig, initServerRouterConfig, FileNotFoundError } from 'bistrio'
import { createActionOptions } from '../customizers/index'
import { ComponentType, lazy } from 'react'

async function importLocal(filePath: string) {
  try {
    return await import(/* webpackMode: "eager" */ `../resources${filePath}`)
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

function loadPage(filePath: string) {
  try {
    return lazy(async () => {
      const { Page } = await import(/* webpackMode: "eager" */ `../../universal/pages${filePath}`)
      return { default: Page as ComponentType<any> }
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
    loadPage,
    importLocal,
  })
}
