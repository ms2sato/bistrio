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
  z,
  ActionDescriptor,
  HttpMethod,
} from 'restrant2/client'
import { filterWithoutKeys } from './object-util'
import { pathJoin } from './path-util'
import { PageNode } from './render-support'
import React from 'react'
import { PageLoadFunc } from '.'

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

export type ViewDescriptor = {
  [key: string]: { Page: PageNode; hydrate: boolean }
}

export type ResourceInfo = { httpPath: string; resource: Resource }
type ResourceNameToInfo = Map<string, ResourceInfo>

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

  resources(rpath: string, routeConfig: RouteConfig): void {
    const fetchJson = async (url: string, method: HttpMethod, body?: BodyInit | null): Promise<unknown> => {
      // TODO: pluggable
      const ret = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })

      if (!ret.ok) {
        throw new Error(`Response status error: ${ret.status}; ${ret.statusText};`)
      }

      // TODO: from ServerResponcePolicy
      const json = await ret.json()
      const data = json.data
      if (data === undefined) {
        throw new Error('Response json has no data')
      }
      return data as unknown
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
