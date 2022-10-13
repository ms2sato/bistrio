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
} from 'restrant2/client'
import { filterWithoutKeys } from './object-util'
import { pathJoin } from './path-util'
import { PageNode, SuspendedNamedResources } from './render-support'

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

export type ViewDescriptor<RS extends NamedResources> = {
  [key: string]: { Page: PageNode<RS>; hydrate: boolean }
}

export type ResourceInfo = { httpPath: string; resource: Resource }
type ResourceNameToInfo = Map<string, ResourceInfo>

export type ClientGenretateRouterCore<RS extends NamedResources> = {
  host: string
  constructConfig: ConstructConfig
  viewDescriptor: ViewDescriptor<RS>
  handlerBuildRunners: HandlerBuildRunner[]
  resourceNameToInfo: ResourceNameToInfo
  pathToPage: Map<string, PageNode<RS>>
}

export class ClientGenretateRouter<RS extends NamedResources> implements Router {
  constructor(
    private viewDescriptor: ViewDescriptor<RS>,
    private httpPath = '/',
    private core: ClientGenretateRouterCore<RS> = {
      host: window.location.origin, // TODO: pluggable
      constructConfig: Actions.defaultConstructConfig(), // TODO: pluggable
      viewDescriptor,
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
      pathToPage: new Map(),
    }
  ) {}

  sub(rpath: string, ..._args: unknown[]): Router {
    // TODO: args and middlewares
    return new ClientGenretateRouter<RS>(this.viewDescriptor, pathJoin(this.httpPath, rpath), this.core)
  }

  resources(rpath: string, routeConfig: RouteConfig): void {
    const fetchJson = async (url: string, method: string, body?: BodyInit | null) => {
      // TODO: pluggable
      const ret = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })
      const json = await ret.json()
      const data = json.data
      if (data === undefined) {
        throw new Error('response json has no data')
      }
      return data
    }

    const createStubMethod = (ad: ActionDescriptor, resourceUrl: string, schema: z.AnyZodObject, method: string) => {
      // TODO: Error handling and throw as Error

      if (schema === blankSchema) {
        return async function (...options: unknown[]) {
          const option = options.length > 0 ? (options[0] as Record<string, string | number>) : {}
          const { httpPath } = createPath(resourceUrl, ad.path, option)
          return fetchJson(httpPath, method)
        }
      } else {
        return async function (input: unknown, ..._options: unknown[]) {
          const parsedInput = schema.parse(input)
          if (parsedInput === undefined) {
            throw new Error('UnexpectedInput')
          }

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
          let method: string
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
          const viewDescriptor = this.core.viewDescriptor[pagePath] // TODO: Can replace import?
          if (ad.page && viewDescriptor.hydrate) {
            this.core.pathToPage.set(pagePath, viewDescriptor.Page)
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
