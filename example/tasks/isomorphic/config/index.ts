import React from 'react'
import { EntriesConfig } from 'bistrio/client'
import { routes as mainRoutes } from '../routes/main'
import { routes as adminRoutes } from '../routes/admin'

// // basic configuration
// import { Actions, ClientRouterConfig } from "bistrio/client"
// export const config = ():Partial<ClientRouterConfig> => {
//   return {
//     host: window.location.origin,
//     constructConfig: Actions.defaultConstructConfig(),
//   }
// }

const getContainerElement = () => {
  const el = document.getElementById('app')
  if (!el) {
    throw new Error('Container element not found')
  }
  return el
}

const pageLoadFunc = (pagePath: string) => {
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
