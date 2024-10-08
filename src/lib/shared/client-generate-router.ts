import { type RouteObject } from 'react-router-dom'

import {
  InputDescriptor,
  Resource,
  ResourceRouteConfig,
  Router,
  HandlerBuildRunner,
  NamedResources,
  choiceSchema,
  StrictInputsConfig,
  Actions,
  blankSchema,
  ActionDescriptor,
  HttpMethod,
  RouterOptions,
  LoadPageFunc,
  ValidationError,
  createValidationError,
  RouterLayoutType,
  createPageActionDescriptor,
  routerPlaceholderRegex,
  ActionType,
  checkRpath,
} from '../../client.js'
import { filterWithoutKeys, toURLSearchParams } from './object-util.js'
import { pathJoin } from './path-util.js'
import { PageNode } from './render-support.js'
import { RouteObjectPickupper } from './route-object-pickupper.js'
import createDebug from 'debug'
import { ZodType } from 'zod'

const debug = createDebug('bistrio:debug:client')

export type FillInPlaceholdersFunc = (routePath: string, callback: (attr: string) => string) => string

const fillInPlaceholders: FillInPlaceholdersFunc = (routePath, callback) =>
  routePath.replace(routerPlaceholderRegex, (ma) => callback(ma.substring(1)))

export type FormatPlaceholderForClientRouterFunc = (routePath: string) => string

const formatPlaceholderForRouter: FormatPlaceholderForClientRouterFunc = (routePath: string) =>
  routePath.replace(routerPlaceholderRegex, ':$1')

export const createPath = (
  config: ClientConfig,
  resourceUrl: string,
  ad: { path: string; type?: ActionType },
  option: Record<string, string | number>,
) => {
  const keys: string[] = []
  const pathFormat = ad.type
    ? `${pathJoin(resourceUrl, ad.path).replace(/\/$/, '')}.${ad.type}`
    : pathJoin(resourceUrl, ad.path)
  const apath = config.fillInPlaceholders(pathFormat, (attr: string) => {
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
  inputsConfig: StrictInputsConfig
  loadPage: LoadPageFunc
  handlerBuildRunners: HandlerBuildRunner[]
  resourceNameToInfo: ResourceNameToInfo
  routeObject: RouteObject
}

export type ClientConfig = {
  host: () => string
  inputsConfig: StrictInputsConfig
  createFetcher: CreateFetcherFunc
  sharedBundlePrefix: string
  jsRoot: string
  fillInPlaceholders: FillInPlaceholdersFunc
  formatPlaceholderForRouter: FormatPlaceholderForClientRouterFunc
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
  fetch(url: string, method: HttpMethod, init?: RequestInit): Promise<unknown>
}

type CreateFetcherFunc = () => Fetcher

const createFetcher: CreateFetcherFunc = (): Fetcher => {
  return {
    async fetch(url: string, method: HttpMethod, init: RequestInit = {}) {
      init.method = method.toUpperCase()
      init.headers = { ...init.headers, 'X-Requested-With': 'XMLHttpRequest' }

      const res = await fetch(url, init)

      const parser = new ResponseJsonParser()
      return parser.parse(res)
    },
  }
}

export const defaultClientConfig = (): ClientConfig => {
  return {
    host: () => location.origin,
    inputsConfig: Actions.defaultInputsConfig(),
    createFetcher,
    sharedBundlePrefix: 'shared--',
    jsRoot: 'js',
    fillInPlaceholders,
    formatPlaceholderForRouter,
  }
}

export const fillClientConfig = (config: ClientConfigCustom) => {
  return { ...config, ...defaultClientConfig() }
}

export class ClientGenretateRouter<RS extends NamedResources> implements Router {
  readonly routeObjectPickupper: RouteObjectPickupper

  constructor(
    private clientConfig: ClientConfig,
    private loadPage: LoadPageFunc,
    private httpPath = '/',
    routeObject: RouteObject = {},
    private core: ClientGenretateRouterCore = {
      host: clientConfig.host(),
      inputsConfig: clientConfig.inputsConfig,
      loadPage,
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
      routeObject,
    },
  ) {
    this.routeObjectPickupper = new RouteObjectPickupper(clientConfig, routeObject, loadPage)
  }

  sub(rpath: string, ..._args: unknown[]): Router {
    const subRouteObject = this.routeObjectPickupper.addNewSub(rpath)

    // TODO: args and middlewares
    return new ClientGenretateRouter<RS>(
      this.clientConfig,
      this.loadPage,
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
        this.clientConfig,
        this.loadPage,
        this.httpPath,
        layoutRouteObject,
        this.core,
      )

      return layoutRouter
    }

    return this
  }

  resources(rpath: string, routeConfig: ResourceRouteConfig): void {
    rpath = checkRpath(rpath)

    const config = this.clientConfig
    const fetcher = this.clientConfig.createFetcher()

    const createStubMethod = (ad: ActionDescriptor, resourceUrl: string, schema: ZodType, method: HttpMethod) => {
      if (schema === blankSchema) {
        return async function (...options: unknown[]) {
          const option = options.length > 0 ? (options[0] as Record<string, string | number>) : {}
          const { httpPath } = createPath(config, resourceUrl, ad, option)
          return fetcher.fetch(httpPath, method)
        }
      } else {
        return async function (input: unknown, ..._options: unknown[]) {
          // TODO: catch error and rethrow with custom error type
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedInput = schema.parse(input)

          const { httpPath, keys } = createPath(config, resourceUrl, ad, input as Record<string, string | number>)

          const body = filterWithoutKeys(parsedInput as { [key: string]: unknown }, keys)
          if (Object.keys(body).length > 0) {
            if (method === 'get' || method === 'head') {
              return fetcher.fetch(`${httpPath}?${toURLSearchParams(body).toString()}`, method)
            } else {
              let hasFile = false
              const formData = new FormData()
              for (const [key, value] of Object.entries(body)) {
                if (value instanceof File) {
                  formData.append(key, value, value.name)
                  hasFile = true
                } else if (Array.isArray(value) && value.length && value.every((v) => v instanceof File)) {
                  for (let i = 0; i < value.length; ++i) {
                    const v = value[i]
                    formData.append(`${key}[${i}]`, v, v.name)
                  }
                  hasFile = true
                } else {
                  formData.append(key, value as string)
                }
              }

              if (hasFile) {
                return fetcher.fetch(httpPath, method, { body: formData })
              } else {
                return fetcher.fetch(httpPath, method, {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                })
              }
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

          const cad: InputDescriptor | undefined = routeConfig.inputs?.[actionName]
          const schema = choiceSchema(this.core.inputsConfig, cad, actionName)

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

      const resource = createResourceProxy(fullResourceRoutePath)
      const pathInfo: ResourceInfo = {
        httpPath: fullResourceRoutePath,
        resource,
      }
      this.core.resourceNameToInfo.set(routeConfig.name, pathInfo)

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

  pages(rpath: string, children: string[]): void {
    const subRouteObject = this.routeObjectPickupper.addNewSub(rpath)
    const pageActionDescriptors: ActionDescriptor[] = []

    this.core.handlerBuildRunners.push(() => {
      const fullResourceRoutePath = pathJoin(this.httpPath, rpath)

      pageActionDescriptors.push(...children.map((child) => createPageActionDescriptor(child)))

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
