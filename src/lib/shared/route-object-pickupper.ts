import { RouteObject } from 'react-router-dom'
import { ActionDescriptor, RouterLayoutType } from './common.js'
import { LoadPageFunc } from './entry.js'
import { pathJoin } from './path-util.js'
import { ClientConfig } from './client-generate-router.js'

export class RouteObjectPickupper {
  constructor(
    private clientConfig: ClientConfig,
    private routeObject: RouteObject,
    private loadPage: LoadPageFunc,
  ) {}

  addNewSub(rpath?: string) {
    return this.addNewSubRouteObject(this.routeObject, rpath)
  }

  willAddNewLayout() {
    return this.routeObject.path
  }

  addNewLayout(props: RouterLayoutType): RouteObject | undefined {
    let layoutRouteObject
    let newObject
    if (this.willAddNewLayout()) {
      layoutRouteObject = this.addNewSub('')
      newObject = true
    } else {
      layoutRouteObject = this.routeObject
      newObject = false
    }

    if ('element' in props && props.element) {
      layoutRouteObject.element = props.element
    } else if ('Component' in props && props.Component) {
      layoutRouteObject.Component = props.Component
    } else {
      throw new Error(`Unexpected Arguments: ${JSON.stringify(props)} element or Component MUST be in`)
    }

    return newObject ? layoutRouteObject : undefined
  }

  pushPageRouteObjectsToSub(httpPath: string, subRouteObject: RouteObject, pageActionDescriptors: ActionDescriptor[]) {
    for (const ad of pageActionDescriptors) {
      if (ad.page !== true) {
        throw new Error(`Unexpected pageActionDescriptors, MUST page = true: ${JSON.stringify(ad)}`)
      }

      const actionRouteObject = this.addNewSubRouteObject(subRouteObject, ad.path)
      const fullPath = pathJoin(httpPath, ad.path)
      const Component = this.loadPage(fullPath)
      if (!Component) {
        throw new Error(`Component not found: ${fullPath}`)
      }
      actionRouteObject.Component = Component
    }
  }

  private addNewSubRouteObject(routeObject: RouteObject, rpath?: string): RouteObject {
    const subRouteObject = rpath ? { path: this.clientConfig.formatPlaceholderForRouter(rpath.replace(/^\//, '')) } : {} // force absolute route
    if (!routeObject.children) {
      routeObject.children = []
    }
    routeObject.children.push(subRouteObject)
    return subRouteObject
  }
}
