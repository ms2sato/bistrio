import { ResourceHolderCreateRouter, ServerRouter, ServerRouterConfig, Resource } from 'restrant2'
import { config } from './config/server'

class RouterFactory {
  constructor(private option: Partial<ServerRouterConfig>) {}

  getServerRouter(dir: string): ServerRouter {
    return new ServerRouter(dir, this.option)
  }

  getResourceHolderCreateRouter(resourcesHolder: unknown, fileRoot: string) {
    return new ResourceHolderCreateRouter(resourcesHolder as Record<string, Resource>, fileRoot, this.option, '/')
  }
}

let _routerFactory: RouterFactory

export function setup() {
  if (!_routerFactory) {
    _routerFactory = new RouterFactory(config())
  }
  return _routerFactory
}
