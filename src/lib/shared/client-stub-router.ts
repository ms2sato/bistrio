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
} from '../../client'
import { filterWithoutKeys } from './object-util'
import { pathJoin } from './path-util'
import { PageNode } from './render-support'
import { z } from 'zod'
import React from 'react'

const createPath = (resourceUrl: string, pathFormat: string, option: Record<string, string | number>) => {
  const keys: string[] = []
  const apath = pathFormat.replace(/:[a-z][\w_]+/g, (ma) => {
    const attr = ma.substring(1)
    const param = option[attr]
    if (param === undefined || param === null) {
      throw new Error(`Unexpected param name: ${attr}`)
    }
    keys.push(attr)
    return String(param)
  })
  return { httpPath: pathJoin(resourceUrl, apath), keys }
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

export type ClientRouterConfig = {
  host: string
  constructConfig: ConstructConfig
}

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
      throw new Error(ret.message) // TOOD: ValidationError
    }

    if (500 <= res.status && res.status < 600) {
      throw new Error(`Fatal Error on Server`) // TODO: ServerSideError
    }

    const data = (json as StandardJsonSuccess).data
    if (data === undefined) {
      throw new Error('Response json has no data')
    }
    return data
  }
}

type StandardJsonSuccess = {
  status: 'success'
  data: unknown
}

type StandardJsonInvalid = {
  status: 'error'
  errors: ValidationError['errors']
  message: ValidationError['message']
}

type StandardJsonFatal = {
  status: 'fatal'
}

type StandardJsonType = StandardJsonSuccess | StandardJsonInvalid | StandardJsonFatal

export class StandardJsonFormatter
  implements JsonFormatter<StandardJsonSuccess, StandardJsonInvalid, StandardJsonFatal>
{
  success(data: unknown) {
    const json: StandardJsonType = { status: 'success', data }
    return { json, status: 200 }
  }

  invalid(validationError: ValidationError) {
    const json: StandardJsonType = { status: 'error', errors: validationError.errors, message: validationError.message }
    return { json, status: 422 }
  }

  fatal(_err: Error) {
    const json: StandardJsonType = { status: 'fatal' }
    return { json, status: 500 }
  }
}

export const defaultClientRouterConfig = (): ClientRouterConfig => {
  return {
    host: window.location.origin,
    constructConfig: Actions.defaultConstructConfig(),
  }
}

export class ClientGenretateRouter<RS extends NamedResources> implements Router {
  constructor(
    private config: ClientRouterConfig,
    private pageLoadFunc: PageLoadFunc,
    private httpPath = '/',
    private core: ClientGenretateRouterCore = {
      host: config.host,
      constructConfig: config.constructConfig,
      pageLoadFunc,
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
      pathToPage: new Map(),
    }
  ) {}

  sub(rpath: string, ..._args: unknown[]): Router {
    // TODO: args and middlewares
    return new ClientGenretateRouter<RS>(this.config, this.pageLoadFunc, pathJoin(this.httpPath, rpath), this.core)
  }

  options(_value: RouterOptions) {
    return this
  }

  resources(rpath: string, routeConfig: RouteConfig): void {
    const fetchJson = async (url: string, method: HttpMethod, body?: BodyInit | null): Promise<unknown> => {
      // TODO: pluggable
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })

      const parser = new ResponseJsonParser() // TODO: from config
      return parser.parse(res)
    }

    const createStubMethod = (
      ad: ActionDescriptor,
      resourceUrl: string,
      schema: z.AnyZodObject,
      method: HttpMethod
    ) => {
      // TODO: Error handling and throw as Error

      if (schema === blankSchema) {
        return async function (...options: unknown[]) {
          const option = options.length > 0 ? (options[0] as Record<string, string | number>) : {}
          const { httpPath } = createPath(resourceUrl, ad.path, option)
          return fetchJson(httpPath, method)
        }
      } else {
        return async function (input: unknown, ..._options: unknown[]) {
          // TODO: catch error and rethrow with custom error type
          const parsedInput = schema.parse(input)

          const { httpPath, keys } = createPath(resourceUrl, ad.path, input as Record<string, string | number>)

          // TODO: pluggable
          const body = filterWithoutKeys(parsedInput, keys)
          if (Object.keys(body).length > 0) {
            return fetchJson(httpPath, method, body as unknown as BodyInit)
          } else {
            return fetchJson(httpPath, method)
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
