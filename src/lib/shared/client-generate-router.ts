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
} from '../../client'
import { filterWithoutKeys, toURLSearchParams } from './object-util'
import { pathJoin } from './path-util'
import { PageNode } from './render-support'
import { z } from 'zod'
import React from 'react'

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
  pathToPage: PathPageMap
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

class ResponseJsonParser {
  async parse(res: Response): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = await res.json()

    if (res.status === 422) {
      const ret = json as StandardJsonInvalid
      throw createValidationError(ret.errors)
    }

    if (500 <= res.status && res.status < 600) {
      throw new Error(`Fatal Error on Server`) // TODO: ServerSideError
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

  fatal(_err: Error) {
    const json: StandardJsonFatal = { status: 'fatal' }
    return { json: json, status: 500 }
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
        method,
        headers: {
          'Content-Type': 'application/json',
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
  constructor(
    private config: ClientConfig,
    private pageLoadFunc: PageLoadFunc,
    private httpPath = '/',
    private core: ClientGenretateRouterCore = {
      host: config.host(),
      constructConfig: config.constructConfig,
      pageLoadFunc,
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
      pathToPage: new Map(),
    },
  ) {}

  sub(rpath: string, ..._args: unknown[]): Router {
    // TODO: args and middlewares
    return new ClientGenretateRouter<RS>(this.config, this.pageLoadFunc, pathJoin(this.httpPath, rpath), this.core)
  }

  options(_value: RouterOptions) {
    return this
  }

  resources(rpath: string, routeConfig: RouteConfig): void {
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

    const createResourceProxy = (httpPath: string) => {
      const resourceUrl = pathJoin(this.core.host, httpPath)
      const resource: Resource = {}
      if (routeConfig.actions) {
        for (const ad of routeConfig.actions) {
          const actionName = ad.action
          let method: HttpMethod
          if (typeof ad.method === 'string') {
            method = ad.method
          } else {
            if (ad.method.length === 0) {
              throw new Error(`method is blank array: ${httpPath}#${ad.action}`)
            }

            // TODO: choice which method
            method = ad.method[0]
          }

          const cad: ConstructDescriptor | undefined = routeConfig.construct?.[actionName]
          const schema = choiceSchema(this.core.constructConfig, cad, actionName)

          resource[actionName] = createStubMethod(ad, resourceUrl, schema, method)

          const pagePath = pathJoin(httpPath, ad.path)
          if (ad.page) {
            this.core.pathToPage.set(pagePath, this.core.pageLoadFunc(pagePath))
          }
        }
      }
      return resource
    }

    this.core.handlerBuildRunners.push(() => {
      const httpPath = pathJoin(this.httpPath, rpath)
      const resource = createResourceProxy(httpPath)

      const pathInfo: ResourceInfo = {
        httpPath,
        resource,
      }
      this.core.resourceNameToInfo.set(routeConfig.name, pathInfo)
    })
  }

  async build() {
    const promises = this.core.handlerBuildRunners.map((runner) => runner())
    await Promise.all(promises)
  }

  getCore() {
    return this.core
  }
}
