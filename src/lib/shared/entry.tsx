import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { NamedResources, Router } from 'restrant2/client'

import { LocaleSelector } from './locale'
import { initLocale, LocaleDictionary } from './localizer'
import { PageNode, RenderSupport } from './render-support'
import { setup, Engine } from './client'

import { StaticProps } from './static-props'
import { setRenderSupportContext, useRenderSupport } from './render-support-context'

export type PageLoadFunc = (pagePath: string) => PageNode | React.LazyExoticComponent<any> // TODO: generics?

export type EntriesConfig = {
  [key: string]: {
    routes: (router: Router, middlewares?: any) => void
    getContainerElement: () => HTMLElement
    pageLoadFunc: PageLoadFunc
  }
}

export async function entry<R extends NamedResources>({
  entriesConfig,
  name,
  localeMap,
}: {
  entriesConfig: EntriesConfig
  name: string
  localeMap: Record<string, LocaleDictionary>
}) {
  const entryItem = entriesConfig[name]
  if (entryItem === undefined) {
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

  const Root = ({
    localeSelector,
    staticProps,
    children,
  }: {
    children: React.ReactNode
    localeSelector: LocaleSelector
    staticProps: StaticProps
  }) => {
    const [renderSupport] = useState(engine.createRenderSupport(localeSelector, staticProps))
    return (
      <RenderSupportContext.Provider value={renderSupport}>
        <BrowserRouter>
          <React.Suspense>
            <Routes>{children}</Routes>
          </React.Suspense>
        </BrowserRouter>
      </RenderSupportContext.Provider>
    )
  }

  const staticPropsJsonElement = document.querySelector('script[type="application/static-props.bistrio+json"]')
  const staticPropsJson = staticPropsJsonElement?.innerHTML
  let staticProps: StaticProps = {}
  if (staticPropsJson) {
    // TODO: validation?
    staticProps = JSON.parse(decodeHtml(staticPropsJson)) as StaticProps
  }

  const container = entryItem.getContainerElement()
  if (!container) {
    throw new Error('container not found')
  }

  const routes = entryItem.routes
  const engine: Engine<R> = await setup<R>(routes, entryItem.pageLoadFunc)

  const RouteList = await Promise.all(
    Array.from(engine.pathToPage(), ([path, Page]) => {
      return <Route key={path} path={path} element={<PageAdapter Page={Page} />}></Route>
    })
  )

  const localeSelector = initLocale(localeMap)
  hydrateRoot(
    container,
    <React.StrictMode>
      <Root localeSelector={localeSelector} staticProps={staticProps}>
        {RouteList}
      </Root>
    </React.StrictMode>
  )
}

function decodeHtml(html: string) {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}
