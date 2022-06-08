import {
  ConstructDescriptor,
  Resource,
  RouteConfig,
  Router,
  HandlerBuildRunner,
  NamedResources,
} from 'restrant2/client'
import { PageNode } from './render-support'

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

export type ViewDescriptor<RS extends NamedResources> = { [key: string]: PageNode<RS> }

export type ResourceInfo = { httpPath: string; resource: Resource }
type ResourceNameToInfo = Map<string, ResourceInfo>

export type ClientGenretateRouterCore<RS extends NamedResources> = {
  host: string
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
      host: 'http://localhost:3000',
      viewDescriptor,
      resourceNameToInfo: new Map<string, ResourceInfo>(),
      handlerBuildRunners: [],
      pathToPage: new Map(),
    }
  ) {}

  sub(rpath: string, ...args: unknown[]): Router {
    return new ClientGenretateRouter<RS>(this.viewDescriptor, pathJoin(this.httpPath, rpath), this.core)
  }

  resources(rpath: string, config: RouteConfig): void {
    const fetchJson = async (url: string, method: string, body?: any) => {
      const ret = await fetch(url, {
        method,
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
      console.log({ httpPath, rpath, thisHttpPath: this.httpPath })
      const resourceUrl = pathJoin(this.core.host, httpPath)

      const resource: Resource = {}
      if (config.actions) {
        for (const ad of config.actions) {
          const actionName = ad.action
          let method: string
          if (typeof ad.method === 'string') {
            method = ad.method
          } else {
            if (ad.method.length === 0) {
              throw new Error(`method is blank array: ${httpPath}#${ad.action}`)
            }
            method = ad.method[0]
          }

          const cad: ConstructDescriptor | undefined = config.construct?.[actionName]
          if (cad?.schema) {
            const schema = cad.schema
            resource[actionName] = async function (input, ...options) {
              const parsedInput = schema.parse(input)
              if (parsedInput === undefined) {
                throw new Error('UnexpectedInput')
              }
              // TODO: replace placeholder!
              return fetchJson(pathJoin(resourceUrl, ad.path), method, parsedInput)
            }
          } else {
            resource[actionName] = async function (...options) {
              // TODO: fix
              const apath = ad.path.indexOf(':id') == -1 ? ad.path : ad.path.replace(':id', options[0].id)
              return fetchJson(pathJoin(resourceUrl, apath), method)
            }
          }

          const pagePath = pathJoin(httpPath, ad.path)
          const Page = this.core.viewDescriptor[pagePath]
          if (ad.page && Page) {
            this.core.pathToPage.set(pagePath, Page)
          }
        }
      }

      const pathInfo: ResourceInfo = {
        httpPath,
        resource,
      }
      this.core.resourceNameToInfo.set(config.name, pathInfo)
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
