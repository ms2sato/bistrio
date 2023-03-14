import React from 'react'
import { EntriesConfig } from 'bistrio'
import { routes as mainRoutes } from './main'
import { routes as adminRoutes } from './admin'

const getContainerElement = () => {
  const el = document.getElementById('app')
  if (!el) {
    throw new Error('No container element found')
  }
  return el
}

const pageLoadFunc = (pagePath: string) => {
  // const viewDescriptor = this.core.viewDescriptor[pagePath] // TODO: Can replace import?
  // if (ad.page && viewDescriptor.hydrate) {
  //   this.core.pathToPage.set(pagePath, viewDescriptor.Page)
  // }
  console.debug(`pagePath: ${pagePath}`)
  return React.lazy(() =>
    import(/*webpackChunkName: "[request]" */ `../views${pagePath}`).then(({ Page }) => ({
      default: Page,
    }))
  )
}

export const entries: EntriesConfig = {
  main: { routes: mainRoutes, getContainerElement, pageLoadFunc },
  admin: { routes: adminRoutes, getContainerElement, pageLoadFunc },
}
