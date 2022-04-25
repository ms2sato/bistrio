import { ResourceHolderCreateRouter, ServerRouter, ServerRouterConfig } from 'restrant2'
import { config } from './config/server'

class RouterFactory {
  constructor(private option: Partial<ServerRouterConfig>) {}

  getServerRouter(dir: string): ServerRouter {
    return new ServerRouter(dir, this.option)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getResourceHolderCreateRouter(resourcesHolder: any, fileRoot: string) {
    return new ResourceHolderCreateRouter(resourcesHolder, fileRoot, this.option, '/')
  }
}

let _routerFactory: RouterFactory

export function setup() {
  if (!_routerFactory) {
    _routerFactory = new RouterFactory(config())
  }
  return _routerFactory
}
