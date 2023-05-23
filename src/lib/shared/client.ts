import { Resource, NamedResources, Router } from '../../client'
import { LocaleSelector, Localizer } from './locale'
import {
  createSuspendedResourcesProxy,
  ParamsDictionary,
  RenderSupport,
  StubResources,
  StubSuspendedResources,
  suspense,
} from './render-support'
import {
  ClientGenretateRouter,
  ClientGenretateRouterCore,
  ClientRouterConfig,
  PathPageMap,
  ResourceInfo,
  defaultClientRouterConfig,
} from './client-stub-router'
import { InvalidState, InvalidStateOrDefaultProps, StaticProps } from './static-props'
import { RouterSupport, nullRouterSupport } from './router-support'
import { PageLoadFunc } from '.'

export class ClientRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  private suspense
  params: ParamsDictionary = {} as const

  readonly isClient: boolean = true
  readonly isServer: boolean = false

  constructor(
    private core: ClientGenretateRouterCore,
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

  resources(): StubResources<RS> {
    const ret: { [name: string]: Resource } = {}
    this.core.resourceNameToInfo.forEach((info, name) => {
      ret[name] = info.resource
    })
    return ret as StubResources<RS>
  }

  suspendedResources(): StubSuspendedResources<RS> {
    return createSuspendedResourcesProxy(this) as StubSuspendedResources<RS>
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }

  get invalidState(): InvalidState | undefined {
    return this.staticProps.invalidState
  }

  invalidStateOr<S>(source: S | (() => S)): InvalidStateOrDefaultProps<S> {
    const inv = this.invalidState
    if (inv) {
      return { error: inv.error, source: inv.source as S }
    }

    return source instanceof Function ? { source: source() } : { source }
  }
}

export type Engine<RS extends NamedResources> = {
  createRenderSupport: (localeSelector: LocaleSelector, staticProps: StaticProps) => ClientRenderSupport<RS>
  pathToPage: () => PathPageMap
}

export async function setup<RS extends NamedResources>(
  routes: (router: Router, routerSupport: RouterSupport) => void,
  pageLoadFunc: PageLoadFunc,
  clientRouterConfig: ClientRouterConfig = defaultClientRouterConfig()
): Promise<Engine<RS>> {
  const cgr = new ClientGenretateRouter<RS>(clientRouterConfig, pageLoadFunc)
  routes(cgr, nullRouterSupport) // routerSupport and Middleware is not working on client side
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
