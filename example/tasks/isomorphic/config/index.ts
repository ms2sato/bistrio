import React from 'react'
import { EntriesConfig, defaultClientConfig } from 'bistrio/client'
import { routes as mainRoutes } from '../routes/main'
import { routes as adminRoutes } from '../routes/admin'

const pageLoadFunc = (pagePath: string) => {
  return React.lazy(() =>
    import(/*webpackChunkName: "[request]" */ `../views${pagePath}`).then(({ Page }) => ({
      default: Page,
    }))
  )
}

const el = 'app'

export const entriesConfig: EntriesConfig = {
  main: { routes: mainRoutes, el, pageLoadFunc },
  admin: { routes: adminRoutes, el, pageLoadFunc },
}

export const clientConfig = defaultClientConfig()
