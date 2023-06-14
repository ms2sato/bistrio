import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { ClientConfig, NamedResources, RenderSupportContext, Router, RouterSupport } from './index'

import { LocaleSelector } from './locale'
import { initLocale, LocaleDictionary } from './localizer'
import { PageNode } from './render-support'
import { setup, Engine } from './client'

import { useRenderSupport } from './render-support-context'

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
  if (!entryConfig) {
    throw new Error(`entry config "${name}" not found in routes/_entries.ts`)
  }

  const PageAdapter = ({ Page }: { Page: PageNode }) => {
    const params = useParams()
    const rs = useRenderSupport<R>()
    rs.params = params
    return <Page />
  }

  const RenderSupportable = ({
    localeSelector,
    children,
  }: {
    children: React.ReactNode
    localeSelector: LocaleSelector
  }) => {
    const rs = engine.createRenderSupport(localeSelector)
    return <RenderSupportContext.Provider value={rs}>{children}</RenderSupportContext.Provider>
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
      <RenderSupportable localeSelector={localeSelector}>
        <Root>{RouteList}</Root>
      </RenderSupportable>
    </React.StrictMode>
  )
}
