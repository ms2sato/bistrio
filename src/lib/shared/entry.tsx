import { ReactNode, StrictMode, LazyExoticComponent } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import {
  ClientConfig,
  ClientGenretateRouter,
  ClientRenderSupport,
  NamedResources,
  nullRouterSupport,
  RenderSupportContext,
  Router,
  RouterSupport,
  initLocale,
  LocaleDictionary,
  PageNode,
} from './index'
import { toRoutes } from './react-router-util'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageLoadFunc = (pagePath: string) => PageNode | LazyExoticComponent<any>

type EntryConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: (router: Router, routerSupport: RouterSupport<any>) => void
  pageLoadFunc: PageLoadFunc
  el: (() => HTMLElement) | string
  RoutesWrapper: (props: { children: ReactNode }) => JSX.Element
}

export type EntriesConfig = {
  [key: string]: EntryConfig
}

const getContainerElement = (id = 'app'): HTMLElement => {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error('Container element not found')
  }
  return el
}

export async function entry<R extends NamedResources>({
  entriesConfig,
  name,
  localeMap,
  clientConfig,
}: {
  entriesConfig: EntriesConfig
  name: string
  localeMap: Record<string, LocaleDictionary>
  clientConfig: ClientConfig
}) {
  const entryConfig = entriesConfig[name]
  if (!entryConfig) {
    throw new Error(`entry config "${name}" not found in routes/_entries.ts`)
  }

  let container: HTMLElement
  if (typeof entryConfig.el === 'string') {
    container = getContainerElement(entryConfig.el)
  } else if (typeof entryConfig.el === 'function') {
    container = entryConfig.el()
  } else {
    throw new Error(`entry config ${name}: el must be string or Function`)
  }

  if (!container) {
    throw new Error('container not found')
  }

  const cgr = new ClientGenretateRouter<R>(clientConfig, entryConfig.pageLoadFunc, '/', {}) // TODO: remove test code
  entryConfig.routes(cgr, nullRouterSupport) // routerSupport and Middleware is not working on client side
  await cgr.build()
  const core = cgr.getCore()

  const localeSelector = initLocale(localeMap)
  const rs = new ClientRenderSupport<R>(core, localeSelector)
  hydrateRoot(
    container,
    <StrictMode>
      <RenderSupportContext.Provider value={rs}>
        <entryConfig.RoutesWrapper>
          <BrowserRouter>{toRoutes(core.routeObject)}</BrowserRouter>
        </entryConfig.RoutesWrapper>
      </RenderSupportContext.Provider>
    </StrictMode>,
  )
}
