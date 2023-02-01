import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { NamedResources, Router } from 'restrant2/client'

import { LocaleSelector } from './locale'
import { initLocale, LocaleDictionary } from './localizer'
import { PageNode, RenderSupport } from './render-support'
import { setup, Engine } from './client'

import { ViewDescriptor } from './client-stub-router'
import { StaticProps } from './static-props'
import { setRenderSupportContext, useRenderSupport } from './render-support-context'

export type EntriesConfig = {
  [key: string]: {
    routes: (router: Router, middlewares?:any) => void
    getContainerElement: () => HTMLElement
  }
}

export async function entry<R extends NamedResources>({
  entries,
  name,
  views,
  localeMap,
}: {
  entries: EntriesConfig,
  name: string,
  views: ViewDescriptor
  localeMap: Record<string, LocaleDictionary>
  container: Element | null
}) {
  const entryItem = entries[name]
  if(entryItem === undefined) {
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

  const Root = ({ localeSelector, staticProps }: { localeSelector: LocaleSelector; staticProps: StaticProps }) => {
    console.debug(engine.pathToPage())
    const [renderSupport] = useState(engine.createRenderSupport(localeSelector, staticProps))
    return (
      <RenderSupportContext.Provider value={renderSupport}>
        <BrowserRouter>
          <Routes>
            {Array.from(engine.pathToPage(), ([path, Page]) => (
              <Route key={path} path={path} element={<PageAdapter Page={Page} />}></Route>
            ))}
          </Routes>
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
  const engine: Engine<R> = await setup<R>(routes, views)
  const localeSelector = initLocale(localeMap)
  hydrateRoot(
    container,
    <React.StrictMode>
      <Root localeSelector={localeSelector} staticProps={staticProps}></Root>
    </React.StrictMode>
  )
}

function decodeHtml(html: string) {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}
