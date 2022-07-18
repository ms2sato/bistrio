import { Resource, NamedResources, Router } from 'restrant2/client'
import { LocaleSelector, Localizer } from './locale'
import { PageNode, ParamsDictionary, RenderSupport, suspense } from './render-support'
import { ClientGenretateRouter, ClientGenretateRouterCore, ResourceInfo, ViewDescriptor } from './client-stub-router'
import { InvalidProps, StaticProps } from './static-props'

export class ClientRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  private suspense
  params: ParamsDictionary = {} as const

  readonly isClient: boolean = true
  readonly isServer: boolean = false

  constructor(
    private core: ClientGenretateRouterCore<RS>,
    private localeSelector: LocaleSelector,
    private staticProps: StaticProps
  ) {
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

  get invalid(): InvalidProps | undefined {
    return this.staticProps.invalid
  }
}

export type Engine<RS extends NamedResources> = {
  createRenderSupport: (localeSelector: LocaleSelector, staticProps: StaticProps) => ClientRenderSupport<RS>
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
    createRenderSupport(localeSelector: LocaleSelector, staticProps: StaticProps): ClientRenderSupport<RS> {
      return new ClientRenderSupport<RS>(core, localeSelector, staticProps)
    },

    pathToPage() {
      return core.pathToPage
    },
  }
}
