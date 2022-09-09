import { Resource, NamedResources, Router } from 'restrant2/client'
import { LocaleSelector, Localizer } from './locale'
import {
  createSuspendedResourcesProxy,
  PageNode,
  ParamsDictionary,
  RenderSupport,
  SuspendedNamedResources,
  suspense,
} from './render-support'
import { ClientGenretateRouter, ClientGenretateRouterCore, ResourceInfo, ViewDescriptor } from './client-stub-router'
import { InvalidState, InvalidStateOrDefaultProps, StaticProps } from './static-props'

export class ClientRenderSupport<RS extends NamedResources, SRS extends SuspendedNamedResources>
  implements RenderSupport<RS, SRS>
{
  private suspense
  params: ParamsDictionary = {} as const

  readonly isClient: boolean = true
  readonly isServer: boolean = false

  constructor(
    private core: ClientGenretateRouterCore<RS, SRS>,
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

  suspendedResources(): SRS {
    return createSuspendedResourcesProxy(this) as SRS
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }

  get invalidState(): InvalidState | undefined {
    return this.staticProps.invalidState
  }

  invalidStateOrDefault<S>(source: S): InvalidStateOrDefaultProps<S> {
    const inv = this.invalidState
    return inv ? { error: inv.error, source: inv.source as S } : { source }
  }
}

export type Engine<RS extends NamedResources, SRS extends SuspendedNamedResources> = {
  createRenderSupport: (localeSelector: LocaleSelector, staticProps: StaticProps) => ClientRenderSupport<RS, SRS>
  pathToPage: () => Map<string, PageNode<RS, SRS>>
}

export async function setup<RS extends NamedResources, SRS extends SuspendedNamedResources>(
  routes: (router: Router) => void,
  views: ViewDescriptor<RS, SRS>
): Promise<Engine<RS, SRS>> {
  const cgr = new ClientGenretateRouter<RS, SRS>(views)
  routes(cgr)
  await cgr.build()
  const core = cgr.getCore()

  return {
    createRenderSupport(localeSelector: LocaleSelector, staticProps: StaticProps): ClientRenderSupport<RS, SRS> {
      return new ClientRenderSupport<RS, SRS>(core, localeSelector, staticProps)
    },

    pathToPage() {
      return core.pathToPage
    },
  }
}
