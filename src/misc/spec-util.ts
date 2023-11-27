import path from 'node:path'
import express from 'express'
import listEndpoints from 'express-list-endpoints'
import { Adapter, RouterCore } from '../lib/action-context.js'
import { initServerRouterConfig } from '../lib/init-server-router-config.js'
import { ServerRouterConfig } from '../lib/server-router-config.js'
import { ServerRouterImpl } from '../lib/server-router-impl.js'
import {
  ClientConfig,
  PageLoadFunc,
  Resource,
  ResourceRouteConfig,
  RouterOptions,
  StandardJsonSuccess,
  defaultClientConfig,
} from '../lib/shared/index.js'
import { RouteObject } from 'react-router-dom'

type VirtualResponse<R> = { statusCode: number; data: R }
type VirtualRequest = { url: string; method: string; headers: Record<string, string> }
type Handle = (
  req: VirtualRequest,
  res: {
    render: () => void
    redirect: () => void
    status: (value: number) => void
    json: (ret: StandardJsonSuccess) => void
  },
  out: () => void,
) => void
type Handlable = { handle: Handle }

const checkHandlable = (router: unknown): router is Handlable => 'handle' in (router as Handlable)

export const fakeRequest = <R>(router: ServerRouterImpl, req: VirtualRequest): Promise<VirtualResponse<R>> =>
  new Promise<VirtualResponse<R>>((resolve, reject) => {
    const expressRouter = router.router
    if (!checkHandlable(expressRouter)) {
      throw new Error('Unexpexted router type')
    }

    let statusCode: number
    // @see https://stackoverflow.com/questions/33090091/is-it-possible-to-call-express-router-directly-from-code-with-a-fake-request
    expressRouter.handle(
      req,
      {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        render() {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        redirect() {},
        status(value: number) {
          statusCode = value
          return this
        },
        json(ret: StandardJsonSuccess) {
          const data = ret.data as VirtualResponse<R>['data']
          resolve({ statusCode, data })
        },
      },
      (...args: unknown[]) => {
        reject(args[0])
      },
    )
  })

export class TestServerRouter extends ServerRouterImpl {
  constructor(
    props: ServerRouterConfig,
    clientConfig: ClientConfig,
    routePath: string,
    routeObject: RouteObject,
    routerCore: RouterCore,
    routerOptions: RouterOptions,
    private mockResources: MockResources,
    private adapter: Adapter = {},
  ) {
    super(props, clientConfig, routePath, routeObject, routerCore, routerOptions)
  }

  protected buildSubRouter(rpath: string, subRouteObject: RouteObject): ServerRouterImpl {
    return new TestServerRouter(
      this.serverRouterConfig,
      this.clientConfig,
      path.join(this.routePath, rpath),
      subRouteObject,
      this.routerCore,
      this.routerOptions,
      this.mockResources,
      this.adapter,
    )
  }

  protected async loadLocalResource(resourcePath: string, _routeConfig: ResourceRouteConfig) {
    return Promise.resolve(this.mockResources[resourcePath])
  }

  protected loadLocalAdapter(_adapterPath: string, _routeConfig: ResourceRouteConfig) {
    return Promise.resolve(this.adapter)
  }
}

export type MockResources = Record<string, Resource>

export type RoutesFunction = (router: ServerRouterImpl) => void

export const buildRouter = async ({
  routes,
  mockResources,
  adapter,
  serverRouterConfig,
  pageLoadFunc,
}: {
  routes: RoutesFunction
  mockResources: MockResources
  adapter?: Adapter
  serverRouterConfig?: ServerRouterConfig
  pageLoadFunc: PageLoadFunc
}): Promise<TestServerRouter> => {
  const routePath = '/'
  const routeObject: RouteObject = {}
  const routerCore: RouterCore = {
    handlerBuildRunners: [],
    nameToResource: new Map(),
    nameToPath: new Map(),
    routeObject,
  }
  const routerOptions: RouterOptions = { hydrate: false }

  const router = new TestServerRouter(
    serverRouterConfig || initServerRouterConfig({ baseDir: './', pageLoadFunc }),
    defaultClientConfig(),
    routePath,
    routeObject,
    routerCore,
    routerOptions,
    mockResources,
    adapter,
  )
  routes(router)
  await router.build()
  return router
}

export const getEndpoints = (router: ServerRouterImpl) => {
  const endpoints = listEndpoints(router.router as express.Express)
  return endpoints.map(({ methods, path }) => ({ methods, path }))
}
