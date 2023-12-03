import { EntriesConfig, defaultClientConfig } from 'bistrio/client'
import { loadPage } from '../../config/client/imports'
import { RoutesWrapper } from '../components/RoutesWrapper'
import { routes as mainRoutes } from '../routes/main'
import { routes as adminRoutes } from '../routes/admin'

const el = 'app'

export const entriesConfig: EntriesConfig = {
  main: { routes: mainRoutes, el, loadPage, RoutesWrapper },
  admin: { routes: adminRoutes, el, loadPage, RoutesWrapper },
}

export const clientConfig = defaultClientConfig()
