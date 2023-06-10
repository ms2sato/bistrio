import { lazy } from 'react'
import { EntriesConfig, defaultClientConfig } from 'bistrio/client'
import { RoutesWrapper } from '../components/RoutesWrapper'
import { routes as mainRoutes } from '../routes/main'
import { routes as adminRoutes } from '../routes/admin'

const pageLoadFunc = (pagePath: string) => {
  return lazy(() =>
    import(/*webpackChunkName: "[request]" */ `../views${pagePath}`).then(({ Page }) => ({
      default: Page,
    }))
  )
}

const el = 'app'

export const entriesConfig: EntriesConfig = {
  main: { routes: mainRoutes, el, pageLoadFunc, RoutesWrapper },
  admin: { routes: adminRoutes, el, pageLoadFunc, RoutesWrapper },
}

export const clientConfig = defaultClientConfig()
