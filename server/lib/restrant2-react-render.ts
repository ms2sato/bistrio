import path from 'path'
import { ActionContextImpl } from 'restrant2'
import { NodeArrangeFunc, renderReactView, PageExport } from './react-ssr-engine'

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
    import(path.join(viewRoot, view))
      .then((ret) => {
        const Page = (ret as PageExport).default
        renderReactView(this.res, arrange(Page, options), failText)
      })
      .catch((err) => {
        console.error(err)
        callback && callback(err as Error, '')
      })
  }

  return newRender
}
