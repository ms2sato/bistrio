import path from 'path'
import { ActionContextImpl, ActionContextCreator } from 'restrant2'
import { NodeArrangeFunc, renderReactView, importPage } from './react-ssr-engine'

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
        renderReactView(this.res, arrange(Page, options), failText)
      })
      .catch((err) => {
        console.error(err)
        callback && callback(err as Error, '')
      })
  }

  return newRender
}

type ActionContextFactory = (viewRoot: string, arrange: NodeArrangeFunc, failText: string) => ActionContextCreator

export const actionContextFactory: ActionContextFactory = (
  viewRoot: string,
  arrange: NodeArrangeFunc,
  failText = ''
) => {
  return (req, res, descriptor, httpPath) => {
    const ctx = new ActionContextImpl(req, res, descriptor, httpPath)
    ctx.render = createRenderFunc(arrange, viewRoot, failText)
    return ctx
  }
}
