import path from 'path'
import { ActionContextImpl, ActionContextCreator, createDefaultActionContext } from 'restrant2'
import { NodeArrangeFunc, renderReactViewStream, importPage } from './react-ssr-engine'
import createDebug from 'debug'

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
        renderReactViewStream(this.res, arrange(Page, options), failText)
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

// -----
// for SSR and CSR

export type Reader<T> = () => T
type ReaderMap = Map<string, Reader<unknown>>

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
export function suspendable<T>(promise: Promise<T>): Reader<T> {
  let result: T
  let err: Error
  const suspender = promise.then(
    (ret) => (result = ret),
    (e: Error) => (err = e)
  )
  return () => {
    if (result) return result
    if (err) throw err
    throw suspender
  }
}

export type RenderSupport = {
  fetchJson: <T>(url: string, key?: string) => T
}

export const createRenderSupport = () => new RenderSupportImpl()

class RenderSupportImpl implements RenderSupport {
  constructor(private readerMap: ReaderMap = new Map()) {}

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
