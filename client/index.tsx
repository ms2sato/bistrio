import * as React from 'react'
import { useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Resource } from 'restrant2/client'
import { LocaleSelector, Localizer } from '../lib/locale'
import { initLocale } from '../lib/localizer'
import { RenderSupport, suspense } from '../lib/render-support'
import { Index } from '../views/tasks/index'
import { Build } from '../views/tasks/build'
import { Edit } from '../views/tasks/edit'
import { ClientGenretateRouter, ClientGenretateRouterCore, ResourceInfo } from './client-stub-router'
import { routes } from '../routes'

class ClientRenderSupport implements RenderSupport {
  private suspense
  constructor(private localeSelector?: LocaleSelector) {
    this.suspense = suspense()
  }

  getLocalizer(): Localizer {
    return this.localeSelector.select(navigator.language)
  }

  fetchJson<T>(url: string, key?: string): T {
    return this.suspense.fetchJson(url, key)
  }

  resourceOf(name: string): Resource {
    return core.resourceNameToInfo.get(name).resource
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }
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
        <Route path="/tasks/" element={<Index rs={renderSupport} />}></Route>
        <Route path="/tasks/build" element={<Build rs={renderSupport} />}></Route>
        <Route path="/tasks/:id/edit" element={<Edit rs={renderSupport} />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

let core: ClientGenretateRouterCore

const hydrate = async () => {
  const cgr = new ClientGenretateRouter()
  routes(cgr)
  await cgr.build()
  core = cgr.getCore()

  const container = document.getElementById('app')
  hydrateRoot(container, await root())
}

hydrate()
