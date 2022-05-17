import path from 'path'
import {
  ActionContextImpl,
  ActionContextCreator,
  createDefaultActionContext,
  ActionContext,
  NullActionContext,
} from 'restrant2'
import { CreateRenderSupportFunc, Reader, RenderSupport, suspendable } from '../../lib/render-support'
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

export const createRenderSupport: CreateRenderSupportFunc = (option: unknown) => {
  const ctx: ActionContext = (option as ActionContext) ?? new NullActionContext()
  return new ServerRenderSupport(ctx)
}

type ReaderMap = Map<string, Reader<unknown>>

class ServerRenderSupport implements RenderSupport {
  constructor(private ctx: ActionContext, private readerMap: ReaderMap = new Map()) {}

  getLocalizer(): Localizer {
    return this.ctx.req.localizer
  }

  fetchJson<T>(url: string, key: string = url): T {
    let reader: Reader<unknown> | undefined = this.readerMap.get(key)
    if (!reader) {
      debug('RenderSupportImpl#fetchJson render undefined, start fetch')
      reader = suspendable(
        fetch(url).then((ret) => {
          return ret.json()
        })
      )
      this.readerMap.set(key, reader)
    }

    return (reader as Reader<T>)()
  }
}
