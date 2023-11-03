import express from 'express'
import listEndpoints from 'express-list-endpoints'
import { Adapter } from '../lib/action-context'
import { initServerRouterConfig } from '../lib/init-server-router-config'
import { ServerRouterConfig } from '../lib/server-router-config'
import { ServerRouterImpl } from '../lib/server-router-impl'
import { PageLoadFunc, Resource, ResourceRouteConfig, StandardJsonSuccess } from '../lib/shared'

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

export class TestServerRouter<R extends Resource> extends ServerRouterImpl {
  constructor(
    props: ServerRouterConfig,
    private resource: R,
    private adapter: Adapter = {},
  ) {
    super(props)
  }

  protected async loadResource(_resourcePath: string, _routeConfig: ResourceRouteConfig) {
    return Promise.resolve(this.resource)
  }

  protected loadAdapter(_adapterPath: string, _routeConfig: ResourceRouteConfig) {
    return Promise.resolve(this.adapter)
  }
}

export type RoutesFunction<R extends Resource> = (router: TestServerRouter<R>) => void

export const buildRouter = async <R extends Resource, A extends Adapter>({
  routes,
  resource,
  adapter,
  serverRouterConfig,
  pageLoadFunc,
}: {
  routes: RoutesFunction<R>
  resource: R
  adapter?: A
  serverRouterConfig?: ServerRouterConfig
  pageLoadFunc: PageLoadFunc
}): Promise<TestServerRouter<R>> => {
  const router = new TestServerRouter<R>(
    serverRouterConfig || initServerRouterConfig({ baseDir: './', pageLoadFunc }),
    resource,
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
