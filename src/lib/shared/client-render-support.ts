import { Resource, NamedResources } from '../../client.js'
import { LocaleSelector, Localizer } from './locale.js'
import {
  createSuspendedResourcesProxy,
  ParamsDictionary,
  RenderSupport,
  StubResources,
  StubSuspendedResources,
  Suspendable,
  suspense,
  SuspensePurgeOptions,
} from './render-support.js'
import { ClientGenretateRouterCore, ResourceInfo } from './client-generate-router.js'

class CacheReadableSuspenseDecorator implements Suspendable {
  constructor(private body: Suspendable) {}

  get readers() {
    return this.body.readers
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    const data = window.BISTRIO.cache[key] // TODO: type checking by zod?
    if (data !== undefined) {
      return this.body.suspend(
        () =>
          Promise.resolve<T>(data as T).then((ret) => {
            delete window.BISTRIO.cache[key]
            return ret
          }),
        key,
      )
    }

    return this.body.suspend(asyncProcess, key)
  }
  fetchJson<T>(url: string, key: string): T {
    return this.body.fetchJson(url, key)
  }
  purge(options?: SuspensePurgeOptions | undefined): void {
    return this.body.purge(options)
  }
}

export class ClientRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  readonly suspense: Suspendable
  params: ParamsDictionary = {} as const

  readonly isClient: boolean = true
  readonly isServer: boolean = false

  constructor(
    private core: ClientGenretateRouterCore,
    private localeSelector: LocaleSelector,
  ) {
    this.suspense = new CacheReadableSuspenseDecorator(suspense())
  }

  getLocalizer(): Localizer {
    return this.localeSelector.select(navigator.language)
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

  get query() {
    return Object.fromEntries(new URLSearchParams(window.location.search))
  }
}
