import React from 'react'
import { ClientConfig, EntriesConfig, defaultClientConfig } from 'bistrio/client'
import { routes as mainRoutes } from '../routes/main'
import { routes as adminRoutes } from '../routes/admin'

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

export const entriesConfig: EntriesConfig = {
  main: { routes: mainRoutes, getContainerElement, pageLoadFunc },
  admin: { routes: adminRoutes, getContainerElement, pageLoadFunc },
}

export const clientConfig: ClientConfig = defaultClientConfig()
