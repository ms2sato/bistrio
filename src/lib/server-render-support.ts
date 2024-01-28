import React from 'react'
import { ActionContext, NamedResources } from '../index.js'
import { safeImport } from './safe-import.js'
import { Localizer } from './shared/locale.js'
import {
  RenderSupport,
  suspense,
  createSuspendedResourcesProxy,
  StubResources,
  StubSuspendedResources,
} from './shared/render-support.js'

type Node = React.FC<unknown>

type PageMaterial = {
  Page: Node
}

export const importPage = async (filePath: string): Promise<PageMaterial> => {
  return (await safeImport(filePath)) as PageMaterial
}

export class ServerRenderSupport<RS extends NamedResources = NamedResources> implements RenderSupport<RS> {
  readonly suspense

  readonly isClient: boolean = false
  readonly isServer: boolean = true

  constructor(private ctx: ActionContext) {
    this.suspense = suspense()
  }

  getLocalizer(): Localizer {
    const localizer = this.ctx.req.localizer
    if (!localizer) {
      throw new Error('Unexpected call getLocalizer: Must use localeMiddleware')
    }
    return localizer
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }

  resources(): StubResources<RS> {
    const ret = this.ctx.resources()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret as StubResources<RS>
  }

  suspendedResources(): StubSuspendedResources<RS> {
    return createSuspendedResourcesProxy(this) as StubSuspendedResources<RS>
  }

  get params() {
    return this.ctx.params
  }

  get query() {
    return this.ctx.query
  }
}
