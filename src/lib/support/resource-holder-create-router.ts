import path from 'path'
import debug from 'debug'
import {
  ConstructDescriptor,
  FileNotFoundError,
  HandlerBuildRunner,
  opt,
  Resource,
  RouteConfig,
  RouterCoreLight,
  RouterLayoutType,
  RouterOptions,
  ServerRouterConfig,
} from '../../'
import { BasicRouter } from '../basic-router'

const log = debug('bistrio')
const debugLog = log.extend('console')

export class ResourceHolderCreateRouter extends BasicRouter {
  constructor(
    private resourcesHolder: Record<string, Resource>,
    serverRouterConfig: ServerRouterConfig,
    httpPath = '/',
    protected readonly routerCore: RouterCoreLight = {
      handlerBuildRunners: [],
      nameToResource: new Map(),
      nameToPath: new Map(),
    },
    private routerOptions: RouterOptions = { hydrate: false },
  ) {
    super(serverRouterConfig, httpPath, routerCore)
  }

  sub(rpath: string) {
    debugLog('sub: %s', rpath)
    return new ResourceHolderCreateRouter(
      this.resourcesHolder,
      this.serverRouterConfig,
      path.join(this.httpPath, rpath),
      this.routerCore,
      { ...this.routerOptions },
    )
  }

  layout(_props: RouterLayoutType) {
    return new ResourceHolderCreateRouter(
      this.resourcesHolder,
      this.serverRouterConfig,
      this.httpPath,
      this.routerCore,
      { ...this.routerOptions },
    )
  }

  options(value: RouterOptions) {
    this.routerOptions = value
    return this
  }

  protected createHandlerBuildRunner(rpath: string, routeConfig: RouteConfig): HandlerBuildRunner {
    debugLog('createHandlerBuildRunner: %s', rpath)
    const isPageOnly = routeConfig.actions?.every((action) => action.page) && true

    return async () => {
      debugLog('%s', rpath)
      const resourcePath = this.getResourcePath(rpath)
      let resource
      try {
        resource = await this.loadResource(resourcePath, routeConfig)
      } catch (err) {
        if (!(err instanceof FileNotFoundError) || !isPageOnly) {
          throw err
        }
        return
      }

      const resourceProxy = createLocalResourceProxy(routeConfig, resource)
      const name = routeConfig.name
      if (this.resourcesHolder[name]) {
        throw new Error(
          `Duplicated Resource name: ${name}; path: ${resourcePath}, with: ${
            this.routerCore.nameToPath.get(name) || 'unknown'
          }`,
        )
      }

      this.resourcesHolder[name] = resourceProxy
      this.routerCore.nameToPath.set(name, resourcePath)
    }
  }
}

const createLocalResourceProxy = (config: RouteConfig, resource: Resource): Resource => {
  const resourceProxy: Resource = {}
  for (const actionName in resource) {
    const resourceMethod = resource[actionName]
    const cad: ConstructDescriptor | undefined = config.construct?.[actionName]
    if (cad?.schema) {
      const schema = cad.schema
      resourceProxy[actionName] = function (...args) {
        if (args.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return resourceMethod.apply(resource)
        } else if (args[0] instanceof opt) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return resourceMethod.apply(resource, [args[0]])
        } else {
          schema.parse(args[0])
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return resourceMethod.apply(resource, args)
        }
      }
    } else {
      resourceProxy[actionName] = function (option) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return resourceMethod.apply(resource, [option])
      }
    }
  }

  return resourceProxy
}
