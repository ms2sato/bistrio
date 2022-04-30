import { renderToString, renderToPipeableStream } from 'react-dom/server'
import express from 'express'

// TODO: fix
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EngineFuncCallback = (err: any, rendered?: string | undefined) => void
type EngineFunc = (path: string, options: object, callback: EngineFuncCallback) => void
type Node = JSX.Element

// TODO: fix
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NodeArrangeFunc = (node: any, options: any) => Node

type PageExport = {
  default: Node
}

export const importPage = async (filePath: string) => {
  const ret = (await import(filePath)) as PageExport
  return ret.default
}

export const engine: (arrange: NodeArrangeFunc) => EngineFunc = (arrange: NodeArrangeFunc) => {
  return (filePath, options, callback) => {
    importPage(filePath)
      .then((Page) => {
        console.warn(
          'Response#render for tsx(set view engine) is low performance, use renderReactViewStream( ex. ctx.ren )'
        )
        const node = arrange(Page, options)
        callback(null, renderToString(node)) // Low performance but easy to use without res
      })
      .catch((err) => {
        callback(err)
      })
  }
}

// @see https://reactjs.org/docs/react-dom-server.html#rendertopipeablestream
export function renderReactViewStream(res: express.Response, node: React.ReactNode, failText = '') {
  let didError = false
  const stream = renderToPipeableStream(node, {
    onShellReady() {
      res.statusCode = didError ? 500 : 200
      res.setHeader('Content-type', 'text/html; charset=UTF-8')
      stream.pipe(res)
    },
    onShellError(err) {
      console.error(err)

      res.statusCode = 500
      res.setHeader('Content-type', 'text/html; charset=UTF-8')
      res.send(failText)
    },
    onAllReady() {
      // nop
    },
    onError(err) {
      didError = true
      console.error(err)
    },
  })
}
