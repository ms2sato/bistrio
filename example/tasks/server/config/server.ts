import path from 'node:path'
import { EndpointFunc, FileNotFoundError, RouteConfig, ServerRouterConfigCustom, isErrorWithCode } from 'bistrio'
import { createActionOptions } from '../customizers/index'
import { pageLoadFunc } from '@isomorphic/config'

const importAndSetup = async <S, R>(
  _fileRoot: string,
  modulePath: string,
  support: S,
  config: RouteConfig,
): Promise<R> => {
  console.log('modulePath', modulePath, _fileRoot)
  try {
    const ret = (await import(/*webpackChunkName: "[request]" */ `../${modulePath}`)) as {
      default: EndpointFunc<S, R>
    }
    return ret.default(support, config)
  } catch (err) {
    if (isErrorWithCode(err) && err.code == 'MODULE_NOT_FOUND') {
      throw new FileNotFoundError(modulePath)
    }

    throw err
  }
}

// config for Routers in server
export function config(): ServerRouterConfigCustom {
  return { baseDir: path.resolve(__dirname, '../'), createActionOptions, pageLoadFunc, importAndSetup }
}
