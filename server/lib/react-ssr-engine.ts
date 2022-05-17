import { renderToString, renderToPipeableStream } from 'react-dom/server'
import express from 'express'
import { ActionContext, NullActionContext } from 'restrant2'
import { safeImport } from './safe-import'
import { PageProps } from '../../lib/render-support'
import React from 'react'

type EngineFuncCallback = (err: unknown, rendered?: string | undefined) => void
type EngineFunc = (path: string, options: object, callback: EngineFuncCallback) => void
type Node = React.FC<unknown>

export type PageNode = React.FC<PageProps>

export type NodeArrangeFunc = (node: PageNode, options: unknown, ctx: ActionContext) => Promise<JSX.Element>

type PageExport = {
  Page: Node
}

export const importPage = async (filePath: string) => {
  const ret = (await safeImport(filePath)) as PageExport
  return ret.Page
}

export const engine: (arrange: NodeArrangeFunc) => EngineFunc = (arrange: NodeArrangeFunc) => {
  return (filePath, options, callback) => {
    importPage(filePath)
      .then((Page) => {
        console.warn(
          'Response#render for tsx(set view engine) is low performance, use renderReactViewStream( ex. ctx.render )'
        )
        arrange(Page, options, new NullActionContext()).then((node) => {
          callback(null, renderToString(node)) // Low performance but easy to use without res
        })
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
