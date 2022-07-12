import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { NamedResources, Router } from 'restrant2/client'

import { LocaleSelector } from './locale'
import { initLocale, LocaleDictionary } from './localizer'
import { PageNode } from './render-support'
import { setup, Engine, ClientRenderSupport } from './client'

import { ViewDescriptor } from './client-stub-router'

export type EntriesConfig = {
  [key: string]: {
    routes: (router: Router) => void
    getContainerElement: () => HTMLElement
  }
}

export async function entry<R extends NamedResources>({
  routes,
  views,
  localeMap,
  container,
}: {
  routes: (router: Router) => void
  views: ViewDescriptor<R>
  localeMap: Record<string, LocaleDictionary>
  container: Element | null
}) {
  const PageAdapter = ({ Page, rs }: { Page: PageNode<R>; rs: ClientRenderSupport<R> }) => {
    const params = useParams()
    rs.params = params
    return <Page rs={rs} />
  }

  const Root = ({ localeSelector }: { localeSelector: LocaleSelector }) => {
    console.debug(engine.pathToPage())
    const [renderSupport] = useState(engine.createRenderSupport(localeSelector))
    return (
      <BrowserRouter>
        <Routes>
          {Array.from(engine.pathToPage(), ([path, Page]) => (
            <Route key={path} path={path} element={<PageAdapter Page={Page} rs={renderSupport} />}></Route>
          ))}
        </Routes>
      </BrowserRouter>
    )
  }

  if (!container) {
    throw new Error('container not found')
  }

  const engine: Engine<R> = await setup<R>(routes, views)
  const localeSelector = initLocale(localeMap)
  hydrateRoot(
    container,
    <React.StrictMode>
      <Root localeSelector={localeSelector}></Root>
    </React.StrictMode>
  )
}
