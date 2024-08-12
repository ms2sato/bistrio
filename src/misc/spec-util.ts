import { createElement } from 'react'

import { Writable } from 'node:stream'
import { join } from 'node:path'
import { Express, Response as ExpressResponse } from 'express'

import listEndpoints from 'express-list-endpoints'
import { Adapter, RouterCore } from '../lib/action-context.js'
import { initServerRouterConfig } from '../lib/init-server-router-config.js'
import { ServerRouterConfig } from '../lib/server-router-config.js'
import { ServerRouterImpl } from '../lib/server-router-impl.js'
import {
  ClientConfig,
  LoadPageFunc,
  Resource,
  ResourceRouteConfig,
  RouterOptions,
  StandardJsonSuccess,
  defaultClientConfig,
} from '../lib/shared/index.js'
import { RouteObject } from 'react-router-dom'
import { ExpressActionContext } from '../lib/express-action-context.js'
import { ActionContextCreator } from '../lib/common.js'

type VirtualRequest = {
  url: string
  method: string
  headers: Record<string, string>
  get: (key: string) => string
  body?: string
}
type Handle = (req: VirtualRequest, res: MockExpressResponse, out: () => void) => void
type Handlable = { handle: Handle }

const checkHandlable = (router: unknown): router is Handlable => 'handle' in (router as Handlable)

export const fakeRequest = (router: ServerRouterImpl, req: VirtualRequest): Promise<MockExpressResponse> =>
  new Promise<MockExpressResponse>((resolve, reject) => {
    const expressRouter = router.router
    if (!checkHandlable(expressRouter)) {
      throw new Error('Unexpexted router type')
    }

    const res = new MockExpressResponse()
    res.on('close', () => resolve(res))

    // @see https://stackoverflow.com/questions/33090091/is-it-possible-to-call-express-router-directly-from-code-with-a-fake-request
    expressRouter.handle(req, res, (...args: unknown[]) => {
      reject(args[0] instanceof Error ? args[0] : new Error(String(args[0])))
    })
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
      join(this.routePath, rpath),
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

export const getDummyServerRouterImpl = ({ loadPage }: { loadPage: LoadPageFunc }) => {
  const routePath = '/'
  const routeObject: RouteObject = {}
  const routerCore: RouterCore = {
    handlerBuildRunners: [],
    nameToResource: new Map(),
    nameToPath: new Map(),
    routeObject,
  }
  const routerOptions: RouterOptions = { hydrate: false }

  return new ServerRouterImpl(
    initServerRouterConfig({ baseDir: './', loadPage }),
    defaultClientConfig(),
    routePath,
    routeObject,
    routerCore,
    routerOptions,
  )
}

export const buildRouter = async ({
  routes,
  mockResources,
  adapter,
  serverRouterConfig,
  loadPage,
}: {
  routes: RoutesFunction
  mockResources: MockResources
  adapter?: Adapter
  serverRouterConfig?: ServerRouterConfig
  loadPage: LoadPageFunc
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

  const createActionContext: ActionContextCreator = (params) => {
    return new ExpressActionContext({ ...params, constructView: () => Promise.resolve(createElement('div')) })
  }

  serverRouterConfig = serverRouterConfig || initServerRouterConfig({ baseDir: './', loadPage })
  const router = new TestServerRouter(
    { ...serverRouterConfig, createActionContext },
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
  const endpoints = listEndpoints(router.router as Express)
  return endpoints.map(({ methods, path }) => ({ methods, path }))
}

export function isBufferEncoding(encoding: string): encoding is BufferEncoding {
  return ['ascii', 'utf8', 'utf16le', 'ucs2', 'base64', 'base64url', 'latin1', 'binary', 'hex'].includes(encoding)
}

export class MockExpressResponse extends Writable {
  private _statusCode: number
  private _data: Buffer = Buffer.alloc(0)
  readonly headers: Record<string, string>
  private _redirectUrl: string | null

  constructor() {
    super()
    this._statusCode = 200
    this.headers = {}
    this._redirectUrl = null
  }

  get statusCode() {
    return this._statusCode
  }

  get data() {
    return this._data
  }

  dataAsString(encoding: BufferEncoding = 'utf8'): string {
    return this._data.toString(encoding)
  }

  dataAsJson<T = unknown>(): T {
    return JSON.parse(this.dataAsString()) as T
  }

  jsonData<T = unknown>(): T {
    return this.dataAsJson<StandardJsonSuccess>().data as T
  }

  get redirectUrl() {
    return this._redirectUrl
  }

  forExpress() {
    return this as unknown as ExpressResponse
  }

  status(code: number) {
    this._statusCode = code
    return this
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value
    return this
  }

  redirect(status: number, url: string): this
  redirect(url: string): this
  redirect(arg1: number | string, arg2?: string) {
    if (typeof arg1 === 'string') {
      this._statusCode = 302
      this._redirectUrl = arg1
    } else {
      this._statusCode = arg1
      this._redirectUrl = arg2 || null
    }
    this.end()
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
    const bencoding: BufferEncoding = isBufferEncoding(encoding) ? encoding : 'utf8'

    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string, bencoding)
    this._data = Buffer.concat([this._data, buffer])
    callback()
  }
}
