import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { ClientConfig, NamedResources, Router, RouterSupport } from '../..'

import { LocaleSelector } from './locale'
import { initLocale, LocaleDictionary } from './localizer'
import { PageNode, RenderSupport } from './render-support'
import { setup, Engine } from './client'

import { StaticProps } from './static-props'
import { setRenderSupportContext, useRenderSupport } from './render-support-context'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageLoadFunc = (pagePath: string) => PageNode | React.LazyExoticComponent<any>

type EntryConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: (router: Router, routerSupport: RouterSupport<any>) => void
  pageLoadFunc: PageLoadFunc
  el: (() => HTMLElement) | string
  RoutesWrapper: (props: { children: React.ReactNode }) => JSX.Element
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
  if (entryConfig === undefined) {
    throw new Error(`entry config "${name}" not found in routes/_entries.ts`)
  }

  const PageAdapter = ({ Page }: { Page: PageNode }) => {
    const params = useParams()
    const rs = useRenderSupport<R>()
    rs.params = params
    return <Page />
  }

  const RenderSupportContext = React.createContext({} as RenderSupport<R>)
  setRenderSupportContext(RenderSupportContext)

  const RenderSupportable = ({
    localeSelector,
    staticProps,
    children,
  }: {
    children: React.ReactNode
    localeSelector: LocaleSelector
    staticProps: StaticProps
  }) => {
    const [renderSupport] = useState(engine.createRenderSupport(localeSelector, staticProps))
    return <RenderSupportContext.Provider value={renderSupport}>{children}</RenderSupportContext.Provider>
  }

  const RoutesWrapper = entryConfig.RoutesWrapper

  const Root = ({ children }: { children: React.ReactNode }) => {
    return (
      <BrowserRouter>
        <RoutesWrapper>
          <Routes>{children}</Routes>
        </RoutesWrapper>
      </BrowserRouter>
    )
  }

  const staticPropsJsonElement = document.querySelector('script[type="application/static-props.bistrio+json"]')
  const staticPropsJson = staticPropsJsonElement?.innerHTML
  let staticProps: StaticProps = {}
  if (staticPropsJson) {
    // TODO: validation?
    staticProps = JSON.parse(decodeHtml(staticPropsJson)) as StaticProps
  }

  let container: HTMLElement
  if (typeof entryConfig.el === 'string') {
    container = getContainerElement(entryConfig.el)
  } else {
    container = entryConfig.el()
  }

  if (!container) {
    throw new Error('container not found')
  }

  const routes = entryConfig.routes
  const engine: Engine<R> = await setup<R>(routes, entryConfig.pageLoadFunc, clientConfig)

  const RouteList = await Promise.all(
    Array.from(engine.pathToPage(), ([path, Page]) => {
      return <Route key={path} path={path} element={<PageAdapter Page={Page} />}></Route>
    })
  )

  const localeSelector = initLocale(localeMap)
  hydrateRoot(
    container,
    <React.StrictMode>
      <RenderSupportable localeSelector={localeSelector} staticProps={staticProps}>
        <Root>{RouteList}</Root>
      </RenderSupportable>
    </React.StrictMode>
  )
}

function decodeHtml(html: string) {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}
