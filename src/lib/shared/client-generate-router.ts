import { z } from 'zod'
import { type RouteObject } from 'react-router-dom'

import {
  ConstructDescriptor,
  Resource,
  RouteConfig,
  Router,
  HandlerBuildRunner,
  NamedResources,
  choiceSchema,
  ConstructConfig,
  Actions,
  blankSchema,
  ActionDescriptor,
  HttpMethod,
  RouterOptions,
  PageLoadFunc,
  ValidationError,
  createValidationError,
  RouterLayoutType,
} from '../../client'
import { filterWithoutKeys, toURLSearchParams } from './object-util'
import { pathJoin } from './path-util'
import { PageNode } from './render-support'
import { RouteObjectPickupper } from './route-object-pickupper'
import createDebug from 'debug'

const debug = createDebug('bistrio:debug:client')

export const createPath = (resourceUrl: string, pathFormat: string, option: Record<string, string | number>) => {
  const keys: string[] = []
  const apath = pathJoin(resourceUrl, pathFormat).replace(/:[a-z][\w_]+/g, (ma) => {
    const attr = ma.substring(1)
    const param = option[attr]
    if (param === undefined || param === null) {
      throw new Error(`Unexpected param name: ${attr}`)
    }
    keys.push(attr)
    return String(param)
  })
  return { httpPath: apath, keys }
}

export type ResourceInfo = { httpPath: string; resource: Resource }
type ResourceNameToInfo = Map<string, ResourceInfo>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PathPageMap = Map<string, PageNode | React.LazyExoticComponent<any>>

export type ClientGenretateRouterCore = {
  host: string
  constructConfig: ConstructConfig
  pageLoadFunc: PageLoadFunc
  handlerBuildRunners: HandlerBuildRunner[]
  resourceNameToInfo: ResourceNameToInfo
  routeObject: RouteObject
}

export type ClientConfig = {
  host: () => string
  constructConfig: ConstructConfig
  createFetcher: CreateFetcherFunc
  sharedBundlePrefix: string
  jsRoot: string
}

export type ClientConfigCustom = Partial<ClientConfig>

interface JsonResponse<D> {
  json: D
  status: number
}

export interface JsonFormatter<S = unknown, I = unknown, F = unknown> {
  success(data: unknown): JsonResponse<S>
  invalid(validationError: ValidationError): JsonResponse<I>
  fatal(_err: Error): JsonResponse<F>
}

class HttpClientError extends Error {
  constructor(
    message: string,
    readonly res: Response,
  ) {
    super(message)
    this.name = 'HttpClientError'
  }
}

class HttpServerError extends Error {
  constructor(
    message: string,
    readonly res: Response,
  ) {
    super(message)
    this.name = 'HttpServerError'
  }
}

class ResponseJsonParser {
  async parse(res: Response): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = await res.json()

    if (res.status === 422) {
      const ret = json as StandardJsonInvalid
      throw createValidationError(ret.errors)
    }

    if (400 <= res.status && res.status < 500) {
      const ret = json as StandardJsonFatal
      throw new HttpClientError(ret.message, res)
    }

    if (500 <= res.status && res.status < 600) {
      const ret = json as StandardJsonFatal
      throw new HttpServerError(ret.message, res)
    }

    return (json as StandardJsonSuccess).data
  }
}

export type StandardJsonSuccess = {
  status: 'success'
  data?: unknown
}

export type StandardJsonInvalid = {
  status: 'error'
  errors: ValidationError['errors']
  message: ValidationError['message']
}

export type StandardJsonFatal = {
  status: 'fatal'
  message: string
}

export class HttpResponseError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message)
    this.name = 'HttpResponseError'
  }
}

export class StandardJsonFormatter
  implements JsonFormatter<StandardJsonSuccess, StandardJsonInvalid, StandardJsonFatal>
{
  success(data: unknown) {
    if (data === undefined || data === null) {
      const json: StandardJsonSuccess = { status: 'success' }
      return { json, status: 200 }
    } else {
      const json: StandardJsonSuccess = { status: 'success', data }
      return { json, status: 200 }
    }
  }

  invalid(validationError: ValidationError) {
    const json: StandardJsonInvalid = {
      status: 'error',
      errors: validationError.errors,
      message: validationError.message,
    }
    return { json, status: 422 }
  }

  fatal(err: Error) {
    if (err instanceof HttpResponseError) {
      const json: StandardJsonFatal = { status: 'fatal', message: err.message }
      return { json, status: err.code }
    }

    const json: StandardJsonFatal = { status: 'fatal', message: 'Fatal error on server' }
    return { json, status: 500 }
  }
}

type Fetcher = {
  fetch(url: string, method: HttpMethod, body?: BodyInit | null): Promise<unknown>
}

type CreateFetcherFunc = () => Fetcher

const createFetcher: CreateFetcherFunc = (): Fetcher => {
  return {
    async fetch(url: string, method: HttpMethod, body?: BodyInit | null) {
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body,
      })

      const parser = new ResponseJsonParser()
      return parser.parse(res)
    },
  }
}

export const defaultClientConfig = (): ClientConfig => {
  return {
    host: () => global.location.origin,
    constructConfig: Actions.defaultConstructConfig(),
    createFetcher,
    sharedBundlePrefix: 'shared--',
    jsRoot: 'js',
  }
}

export const fillClientConfig = (config: ClientConfigCustom) => {
  return { ...config, ...defaultClientConfig() }
}

export class ClientGenretateRouter<RS extends NamedResources> implements Router {
  private routeObjectPickupper: RouteObjectPickupper

  constructor(
    private config: ClientConfig,
    private pageLoadFunc: PageLoadFunc,
    private httpPath = '/',
    routeObject: RouteObject = {},
    private core: ClientGenretateRouterCore = {
      host: config.host(),
      constructConfig: config.constructConfig,
      pageLoadFunc,
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
      routeObject,
    },
  ) {
    this.routeObjectPickupper = new RouteObjectPickupper(routeObject, pageLoadFunc)
  }

  sub(rpath: string, ..._args: unknown[]): Router {
    const subRouteObject = this.routeObjectPickupper.addNewSub(rpath)

    // TODO: args and middlewares
    return new ClientGenretateRouter<RS>(
      this.config,
      this.pageLoadFunc,
      pathJoin(this.httpPath, rpath),
      subRouteObject,
      this.core,
    )
  }

  options(_value: RouterOptions) {
    return this
  }

  layout(props: RouterLayoutType) {
    const layoutRouteObject: RouteObject | undefined = this.routeObjectPickupper.addNewLayout(props)

    if (layoutRouteObject) {
      const layoutRouter = new ClientGenretateRouter(
        this.config,
        this.pageLoadFunc,
        this.httpPath,
        layoutRouteObject,
        this.core,
      )

      return layoutRouter
    }

    return this
  }

  resources(rpath: string, routeConfig: RouteConfig, pages = false): void {
    const fetcher = this.config.createFetcher()

    const createStubMethod = (
      ad: ActionDescriptor,
      resourceUrl: string,
      schema: z.AnyZodObject,
      method: HttpMethod,
    ) => {
      if (schema === blankSchema) {
        return async function (...options: unknown[]) {
          const option = options.length > 0 ? (options[0] as Record<string, string | number>) : {}
          const { httpPath } = createPath(resourceUrl, ad.path, option)
          return fetcher.fetch(httpPath, method)
        }
      } else {
        return async function (input: unknown, ..._options: unknown[]) {
          // TODO: catch error and rethrow with custom error type
          const parsedInput = schema.parse(input)

          const { httpPath, keys } = createPath(resourceUrl, ad.path, input as Record<string, string | number>)

          const body = filterWithoutKeys(parsedInput, keys)
          if (Object.keys(body).length > 0) {
            if (method === 'get' || method === 'head') {
              return fetcher.fetch(`${httpPath}?${toURLSearchParams(body).toString()}`, method)
            } else {
              return fetcher.fetch(httpPath, method, JSON.stringify(body))
            }
          } else {
            return fetcher.fetch(httpPath, method)
          }
        }
      }
    }

    const createResourceProxy = (fullResourceRoutePath: string) => {
      const resourceUrl = pathJoin(this.core.host, fullResourceRoutePath)
      const resource: Resource = {}
      if (routeConfig.actions) {
        for (const ad of routeConfig.actions) {
          const actionName = ad.action
          let method: HttpMethod
          if (typeof ad.method === 'string') {
            method = ad.method
          } else {
            if (ad.method.length === 0) {
              throw new Error(`method is blank array: ${fullResourceRoutePath}#${ad.action}`)
            }

            // TODO: choice which method
            method = ad.method[0]
          }

          const cad: ConstructDescriptor | undefined = routeConfig.construct?.[actionName]
          const schema = choiceSchema(this.core.constructConfig, cad, actionName)

          resource[actionName] = createStubMethod(ad, resourceUrl, schema, method)

          if (ad.page) {
            pageActionDescriptors.push(ad)
          }
        }
      }
      return resource
    }

    const hasPages = routeConfig.actions?.some((ad) => ad.page) ?? false
    const subRouteObject = hasPages ? this.routeObjectPickupper.addNewSub(rpath) : undefined
    const pageActionDescriptors: ActionDescriptor[] = []

    debug('hasPages: %d, subRouteObject: %o', hasPages, subRouteObject)

    this.core.handlerBuildRunners.push(() => {
      const fullResourceRoutePath = pathJoin(this.httpPath, rpath)

      if (pages && routeConfig.actions) {
        pageActionDescriptors.push(...routeConfig.actions)
      } else {
        const resource = createResourceProxy(fullResourceRoutePath)
        const pathInfo: ResourceInfo = {
          httpPath: fullResourceRoutePath,
          resource,
        }
        this.core.resourceNameToInfo.set(routeConfig.name, pathInfo)
      }

      debug('pageAd: %o', pageActionDescriptors)

      if (subRouteObject) {
        this.routeObjectPickupper.pushPageRouteObjectsToSub(
          fullResourceRoutePath,
          subRouteObject,
          pageActionDescriptors,
        )
      }
    })
  }

  async build() {
    const promises = this.core.handlerBuildRunners.map((runner) => runner())
    await Promise.all(promises)
  }

  getCore(): ClientGenretateRouterCore {
    return this.core
  }
}
