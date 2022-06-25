import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { LocaleSelector } from '../lib/locale'
import { initLocale } from '../lib/localizer'
import { setup, Engine, ClientRenderSupport } from '../lib/client'

import { localeMap } from '../locales'
import { views } from '../_views'
import { routes } from '../routes'
import { N2R } from '../_types'
import { PageNode } from '../lib/render-support'

const Root = ({ localeSelector }: { localeSelector: LocaleSelector }) => {
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

const PageAdapter = ({ Page, rs }: { Page: PageNode<N2R>; rs: ClientRenderSupport<N2R> }) => {
  const params = useParams()
  rs.params = params
  return <Page rs={rs} />
}

let engine: Engine<N2R>

const boot = async () => {
  engine = await setup<N2R>(routes, views)
  const container = document.getElementById('app')
  if (!container) {
    throw new Error('#app not found')
  }

  const localeSelector = initLocale(localeMap)
  hydrateRoot(
    container,
    <React.StrictMode>
      <Root localeSelector={localeSelector}></Root>
    </React.StrictMode>
  )
}

boot().catch((err) => {
  console.error(err)
})
