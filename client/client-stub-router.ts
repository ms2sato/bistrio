import {
  ActionDescriptor,
  ConstructDescriptor,
  Resource,
  RouteConfig,
  Router,
  ConstructConfig,
  HandlerBuildRunner,
} from 'restrant2/client'
import { PageNode } from '../lib/render-support'

// @see https://stackoverflow.com/questions/29855098/is-there-a-built-in-javascript-function-similar-to-os-path-join
function pathJoin(...parts: string[]) {
  const separator = '/'
  parts = parts.map((part, index) => {
    if (index) {
      part = part.replace(new RegExp('^' + separator), '')
    }
    if (index !== parts.length - 1) {
      part = part.replace(new RegExp(separator + '$'), '')
    }
    return part
  })
  return parts.join(separator)
}

// resource_name: URL
// resource_name: Page
// resource_name#action: ZodSchema
//
// resource_name: { path, Page, resource }

export type ResourceInfo = { httpPath: string; resource: Resource; pages: Map<string, PageNode> }
type ResourceNameToInfo = Map<string, ResourceInfo>

export type ClientGenretateRouterCore = {
  host: string
  handlerBuildRunners: HandlerBuildRunner[]
  resourceNameToInfo: ResourceNameToInfo
}

export class ClientGenretateRouter implements Router {
  constructor(
    private httpPath = '/',
    private core: ClientGenretateRouterCore = {
      host: 'http://localhost:3000',
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
    }
  ) {}

  sub(rpath: string, ...args: unknown[]): Router {
    return new ClientGenretateRouter(pathJoin(this.httpPath, rpath), this.core)
  }

  resources(rpath: string, config: RouteConfig): void {
    const fetchJson = async (url: string, method: string, body?: any) => {
      const ret = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })
      const json = await ret.json()
      return json.data
    }

    this.core.handlerBuildRunners.push(async () => {
      const httpPath = pathJoin(this.httpPath, rpath)
      const resourceUrl = pathJoin(this.core.host, httpPath)

      const viewRoot = `/views`
      // TODO: read Page
      const pages = new Map<string, PageNode>()

      const resource: Resource = {}
      for (const ad of config.actions) {
        const actionName = ad.action
        const cad: ConstructDescriptor | undefined = config.construct?.[actionName]
        if (cad?.schema) {
          const schema = cad.schema
          resource[actionName] = async function (input, ...options) {
            const parsedInput = schema.parse(input)
            if (parsedInput === undefined) {
              throw new Error('UnexpectedInput')
            }
            // TODO: replace placeholder!
            return fetchJson(pathJoin(resourceUrl, ad.path), ad.method, parsedInput)
          }
        } else {
          resource[actionName] = async function (...options) {
            const apath = ad.path.indexOf(':id') == -1 ? ad.path : ad.path.replace(':id', options[0].id)
            return fetchJson(pathJoin(resourceUrl, apath), ad.method)
          }
        }
      }
      const pathInfo: ResourceInfo = {
        httpPath,
        resource,
        pages,
      }
      this.core.resourceNameToInfo.set(config.name, pathInfo)
    })
  }

  resourceOf<R extends Resource>(name: string): R {}

  async build() {
    const promises = this.core.handlerBuildRunners.map((runner) => runner())
    await Promise.all(promises)
  }

  getCore() {
    return this.core
  }
}
