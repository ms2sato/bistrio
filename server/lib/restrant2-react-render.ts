import path from 'path'
import {
  ActionContextImpl,
  ActionContextCreator,
  createDefaultActionContext,
  ActionContext,
  NullActionContext,
} from 'restrant2'
import { Resource } from 'restrant2/client'
import { RenderSupport, suspense } from '../../lib/render-support'
import { NodeArrangeFunc, renderReactViewStream, importPage } from './react-ssr-engine'
import createDebug from 'debug'
import { Localizer } from '../../lib/locale'

export * from '../lib/react-ssr-engine'

const debug = createDebug('bistrio:react')

export const createRenderFunc = (arrange: NodeArrangeFunc, viewRoot: string, failText = '') => {
  function newRender(
    this: ActionContextImpl,
    view: string,
    options: object | undefined,
    callback?: (err: Error, html: string) => void
  ): void
  function newRender(this: ActionContextImpl, view: string, callback?: (err: Error, html: string) => void): void
  function newRender(
    this: ActionContextImpl,
    view: string,
    options: object | undefined | { (err: Error, html: string): void },
    callback?: (err: Error, html: string) => void
  ): void {
    importPage(path.join(viewRoot, view))
      .then((Page) => {
        return arrange(Page, options, this)
      })
      .then((node) => {
        renderReactViewStream(this.res, node, failText)
      })
      .catch((err) => {
        console.error(err)
        if (callback) {
          callback(err as Error, '')
        } else {
          throw err
        }
      })
  }

  return newRender
}

export type BuildActionContextCreator = (
  viewRoot: string,
  arrange: NodeArrangeFunc,
  failText: string
) => ActionContextCreator

export const buildActionContextCreator: BuildActionContextCreator = (
  viewRoot: string,
  arrange: NodeArrangeFunc,
  failText = ''
) => {
  return (props) => {
    const ctx = createDefaultActionContext(props)
    ctx.render = createRenderFunc(arrange, viewRoot, failText)
    return ctx
  }
}

export const createRenderSupport = (ctx: ActionContext = new NullActionContext()) => {
  return new ServerRenderSupport(ctx)
}

class ServerRenderSupport implements RenderSupport {
  private suspense

  constructor(private ctx: ActionContext) {
    this.suspense = suspense()
  }

  getLocalizer(): Localizer {
    return this.ctx.req.localizer
  }

  fetchJson<T>(url: string, key: string = url): T {
    return this.suspense.fetchJson(url, key)
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }

  resourceOf<T extends Resource>(name: string): T {
    return this.ctx.resourceOf<T>(name)
  }
}
