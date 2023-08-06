import { RouteObject } from "react-router-dom"
import { ActionDescriptor } from "./common"
import { PageLoadFunc } from "./entry"
import { pathJoin } from "./path-util"

export class RouteObjectPickupper {
  constructor(
    private routeObject: RouteObject,
    private pageLoadFunc: PageLoadFunc,
  ) {}

  addNewSub(rpath?: string) {
    return addNewSubRouteObject(this.routeObject, rpath)
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
}

function addNewSubRouteObject(routeObject: RouteObject, rpath?: string): RouteObject {
  const subRouteObject = rpath ? { path: rpath.replace(/^\//, '') } : {} // force absolute route
  if (!routeObject.children) {
    routeObject.children = []
  }
  routeObject.children.push(subRouteObject)
  return subRouteObject
}