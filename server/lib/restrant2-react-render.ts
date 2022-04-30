import path from 'path'
import { ActionContextImpl, ActionContextCreator, createDefaultActionContext } from 'restrant2'
import { NodeArrangeFunc, renderReactViewStream, importPage } from './react-ssr-engine'

export * from '../lib/react-ssr-engine'

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
        callback && callback(err as Error, '')
      })
  }

  return newRender
}

export type ActionContextCreatorFactory = (
  viewRoot: string,
  arrange: NodeArrangeFunc,
  failText: string
) => ActionContextCreator

export const actionContextCreatorFactory: ActionContextCreatorFactory = (
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
