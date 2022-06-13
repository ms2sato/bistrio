import * as React from 'react'
import { useState } from 'react'

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { hydrateRoot } from 'react-dom/client'
import { LocaleSelector } from '../lib/locale'
import { initLocale } from '../lib/localizer'
import { setup, App } from '../lib/client'

import { views } from '../views'
import { routes } from '../routes'
import { N2R } from '../_types'

const root = async () => {
  const localeSelector = await initLocale()

  return <Root localeSelector={localeSelector}></Root>
}

const Root = ({ localeSelector }: { localeSelector: LocaleSelector }) => {
  const [renderSupport] = useState(instance.createRenderSupport(localeSelector))
  return (
    <BrowserRouter>
      <Routes>
        {Array.from(instance.pathToPage()).map(([path, Page]) => {
          console.debug('<Route>', path, Page)
          return <Route key={path} path={path} element={<Page rs={renderSupport} />}></Route>
        })}
      </Routes>
    </BrowserRouter>
  )
}

let instance: App<N2R>

const boot = async () => {
  instance = await setup<N2R>(routes, views)
  const container = document.getElementById('app')
  if (!container) {
    throw new Error('#app not found')
  }

  hydrateRoot(container, await root())
}

boot().catch((err) => {
  console.error(err)
})
