import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { NamedResources, Router } from 'restrant2/client'

import { LocaleSelector } from './locale'
import { initLocale, LocaleDictionary } from './localizer'
import { PageNode, SuspendedNamedResources } from './render-support'
import { setup, Engine, ClientRenderSupport } from './client'

import { ViewDescriptor } from './client-stub-router'
import { StaticProps } from './static-props'

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

  const Root = ({ localeSelector, staticProps }: { localeSelector: LocaleSelector; staticProps: StaticProps }) => {
    console.debug(engine.pathToPage())
    const [renderSupport] = useState(engine.createRenderSupport(localeSelector, staticProps))
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

  const staticPropsJsonElement = document.querySelector('script[type="application/static-props.bistrio+json"]')
  const staticPropsJson = staticPropsJsonElement?.innerHTML
  let staticProps: StaticProps = {}
  if (staticPropsJson) {
    // TODO: validation?
    staticProps = JSON.parse(decodeHtml(staticPropsJson)) as StaticProps
  }

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
