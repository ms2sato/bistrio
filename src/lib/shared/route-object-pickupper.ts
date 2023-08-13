import { RouteObject } from 'react-router-dom'
import { ActionDescriptor, RouterLayoutType } from './common'
import { PageLoadFunc } from './entry'
import { pathJoin } from './path-util'

export class RouteObjectPickupper {
  constructor(
    private routeObject: RouteObject,
    private pageLoadFunc: PageLoadFunc,
  ) {}

  addNewSub(rpath?: string) {
    return addNewSubRouteObject(this.routeObject, rpath)
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

  pushPageRouteObjects(httpPath: string, rpath: string, pageActionDescriptors: ActionDescriptor[]) {
    if (pageActionDescriptors.length === 0) {
      return
    }

    const subRouteObject = addNewSubRouteObject(this.routeObject, rpath)

    for (const ad of pageActionDescriptors) {
      if (ad.page !== true) {
        throw new Error(`Unexpected pageActionDescriptors, MUST page = true: ${JSON.stringify(ad)}`)
      }

      const actionRouteObject = addNewSubRouteObject(subRouteObject, ad.path)
      actionRouteObject.Component = this.pageLoadFunc(pathJoin(httpPath, ad.path))
    }
  }

  pushPageRouteObjectsToSub(httpPath: string, subRouteObject: RouteObject, pageActionDescriptors: ActionDescriptor[]) {
    for (const ad of pageActionDescriptors) {
      if (ad.page !== true) {
        throw new Error(`Unexpected pageActionDescriptors, MUST page = true: ${JSON.stringify(ad)}`)
      }

      const actionRouteObject = addNewSubRouteObject(subRouteObject, ad.path)
      const fullPath = pathJoin(httpPath, ad.path)
      const Component = this.pageLoadFunc(fullPath)
      if (!Component) {
        throw new Error(`Component not found: ${fullPath}`)
      }
      actionRouteObject.Component = Component
    }
  }
}

function addNewSubRouteObject(routeObject: RouteObject, rpath?: string): RouteObject {
  const subRouteObject = rpath ? { path: rpath.replace(/^\//, '') } : {} // force absolute route
  if (!routeObject.children) {
    routeObject.children = []
  }
  routeObject.children.push(subRouteObject)
  return subRouteObject
}
