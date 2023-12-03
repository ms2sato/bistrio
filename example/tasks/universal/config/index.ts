import { lazy } from 'react'
import { EntriesConfig, defaultClientConfig } from 'bistrio/client'
import { RoutesWrapper } from '../components/RoutesWrapper'
import { routes as mainRoutes } from '../routes/main'
import { routes as adminRoutes } from '../routes/admin'

export const loadPage = (pagePath: string) => {
  return lazy(() =>
    import(/*webpackChunkName: "[request]" */ `../pages${pagePath}`).then(({ Page }) => ({
      default: Page,
    })),
  )
}

const el = 'app'

export const entriesConfig: EntriesConfig = {
  main: { routes: mainRoutes, el, loadPage, RoutesWrapper },
  admin: { routes: adminRoutes, el, loadPage, RoutesWrapper },
}

export const clientConfig = defaultClientConfig()
