import * as React from 'react'
import { useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Resource, NamedResources } from 'restrant2/client'
import { LocaleSelector, Localizer } from '../lib/locale'
import { initLocale } from '../lib/localizer'
import { RenderSupport, suspense } from '../lib/render-support'
import { views } from '../views'
import { ClientGenretateRouter, ClientGenretateRouterCore } from '../lib/client-stub-router'
import { routes } from '../routes'
import { N2R } from '../_types'

class ClientRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
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

  resources(): RS {
    const ret: { [key: string]: Resource } = {}
    for (const [key, info] of core.resourceNameToInfo.entries()) {
      ret[key] = info.resource
    }
    return ret as RS
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
  const [renderSupport] = useState(new ClientRenderSupport<N2R>(localeSelector))
  return (
    <BrowserRouter>
      <Routes>
        {Array.from(core.pathToPage).map(([path, Page]) => {
          console.debug('<Route>', path, Page)
          return <Route key={path} path={path} element={<Page rs={renderSupport} />}></Route>
        })}
      </Routes>
    </BrowserRouter>
  )
}

let core: ClientGenretateRouterCore<N2R>

const hydrate = async () => {
  const cgr = new ClientGenretateRouter<N2R>(views)
  routes(cgr)
  await cgr.build()
  core = cgr.getCore()

  const container = document.getElementById('app')
  hydrateRoot(container, await root())
}

hydrate().catch((err) => {
  console.error(err)
})
