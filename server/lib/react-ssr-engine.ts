import { renderToString, renderToPipeableStream } from 'react-dom/server'
import express from 'express'

type EngineFuncCallback = (e: any, rendered?: string | undefined) => void
type EngineFunc = (path: string, options: object, callback: EngineFuncCallback) => void
type Node = JSX.Element
export type NodeArrangeFunc = (node: any, options: any) => Node

export type PageExport = {
  default: JSX.Element
}

export const engine: (arrange: NodeArrangeFunc) => EngineFunc = (arrange: NodeArrangeFunc) => {
  return (filePath, options, callback) => {
    import(filePath)
      .then((ret) => {
        const Page = (ret as PageExport).default
        const node = arrange(Page, options)
        callback(null, renderToString(node)) // Low performance but easy to use without res
      })
      .catch((err) => {
        callback(err)
      })
  }
}

// @see https://reactjs.org/docs/react-dom-server.html#rendertopipeablestream
export function renderReactView(res: express.Response, node: React.ReactNode, failText = '') {
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
