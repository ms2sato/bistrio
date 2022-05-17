import * as React from 'react'
import { useState } from 'react'
import { RenderSupport } from '../lib/render-support'
import { hydrateRoot } from 'react-dom/client'
import { Index } from '../views/tasks/index'
import { Build } from '../views/tasks/build'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LocaleSelector, Localizer } from '../lib/locale'
import { initLocale } from '../lib/localizer'

class ClientRenderSupport implements RenderSupport {
  constructor(private localeSelector?: LocaleSelector) {}

  getLocalizer(): Localizer {
    return this.localeSelector.select('ja')
  }
  fetchJson: <T>(url: string, key?: string) => T
}

const root = async () => {
  const localeSelector = await initLocale()
  return <Root localeSelector={localeSelector}></Root>
}

const Root = ({ localeSelector }: { localeSelector: LocaleSelector }) => {
  const [renderSupport] = useState(new ClientRenderSupport(localeSelector))
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/tasks/" element={<Index rs={renderSupport} />}></Route> */}
        <Route path="/tasks/build" element={<Build rs={renderSupport} />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

const main = async () => {
  const container = document.getElementById('app')
  hydrateRoot(container, await root())
}

main()
