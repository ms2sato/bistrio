import { Resource, NamedResources, Router } from 'restrant2/client'
import { LocaleSelector, Localizer } from './locale'
import { PageNode, RenderSupport, suspense } from './render-support'
import { ClientGenretateRouter, ClientGenretateRouterCore, ResourceInfo, ViewDescriptor } from './client-stub-router'

class ClientRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  private suspense

  constructor(private core: ClientGenretateRouterCore<RS>, private localeSelector: LocaleSelector) {
    this.suspense = suspense()
  }

  getLocalizer(): Localizer {
    return this.localeSelector.select(navigator.language)
  }

  fetchJson<T>(url: string, key?: string): T {
    return this.suspense.fetchJson(url, key)
  }

  resourceOf(name: string): Resource {
    const info: ResourceInfo | undefined = this.core.resourceNameToInfo.get(name)
    if (!info) {
      throw new Error(`resource info not found: ${name}`)
    }
    return info.resource
  }

  resources(): RS {
    const ret: { [name: string]: Resource } = {}
    this.core.resourceNameToInfo.forEach((info, name) => {
      ret[name] = info.resource
    })
    return ret as RS
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }
}

export type Engine<RS extends NamedResources> = {
  createRenderSupport: (localeSelector: LocaleSelector) => ClientRenderSupport<RS>
  pathToPage: () => Map<string, PageNode<RS>>
}

export async function setup<RS extends NamedResources>(
  routes: (router: Router) => void,
  views: ViewDescriptor<RS>
): Promise<Engine<RS>> {
  const cgr = new ClientGenretateRouter<RS>(views)
  routes(cgr)
  await cgr.build()
  const core = cgr.getCore()

  return {
    createRenderSupport(localeSelector: LocaleSelector): ClientRenderSupport<RS> {
      return new ClientRenderSupport<RS>(core, localeSelector)
    },

    pathToPage() {
      return core.pathToPage
    },
  }
}
