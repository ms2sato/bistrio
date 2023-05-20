import path from 'path'
import debug from 'debug'
import {
  BasicRouter,
  createLocalResourceProxy,
  HandlerBuildRunner,
  importAndSetup,
  Middlewares,
  nullRouterSupport,
  Resource,
  ResourceSupport,
  RouteConfig,
  Router,
  RouterCore,
  RouterOptions,
  RouterSupport,
  ServerRouterConfigCustom,
} from '../../'

const log = debug('bistrio')
const debugLog = log.extend('console')

class ResourceHolderCreateRouter extends BasicRouter {
  private nameToPath: Record<string, string> = {}

  constructor(
    private resourcesHolder: Record<string, Resource>,
    serverRouterConfig: ServerRouterConfigCustom,
    httpPath = '/',
    protected readonly routerCore: RouterCore = { handlerBuildRunners: [], nameToResource: new Map() },
    private routerOptions: RouterOptions = { hydrate: false }
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
      { ...this.routerOptions }
    )
  }

  options(value: RouterOptions) {
    this.routerOptions = value
    return this
  }

  protected createHandlerBuildRunner(rpath: string, routeConfig: RouteConfig): HandlerBuildRunner {
    debugLog('createHandlerBuildRunner: %s', rpath)
    const fileRoot = this.serverRouterConfig.baseDir
    return async () => {
      debugLog('%s', rpath)
      const resourcePath = this.getResourcePath(rpath)
      const resourceSupport = new ResourceSupport(fileRoot)
      const resource = await importAndSetup<ResourceSupport, Resource>(
        fileRoot,
        resourcePath,
        resourceSupport,
        routeConfig
      )

      const resourceProxy = createLocalResourceProxy(routeConfig, resource)
      const name = routeConfig.name
      if (this.resourcesHolder[name]) {
        throw new Error(`Duplicated Resource name: ${name}; path: ${resourcePath}, with: ${this.nameToPath[name]}`)
      }

      this.resourcesHolder[name] = resourceProxy
      this.nameToPath[name] = resourcePath
    }
  }
}

export async function loadResources<M extends Middlewares>(
  serverRouterConfig: ServerRouterConfigCustom,
  routes: (router: Router, support: RouterSupport<M>) => void
) {
  const resources = {} as Record<string, Resource>

  // TODO: fix any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ;(global as any).resources = resources

  const router = new ResourceHolderCreateRouter(resources, serverRouterConfig, '/')
  routes(router, nullRouterSupport as RouterSupport<M>)
  await router.build()
}
