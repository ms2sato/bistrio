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

export const entries: EntriesConfig = {
  main: { routes: mainRoutes, getContainerElement },
  admin: { routes: adminRoutes, getContainerElement },
}
