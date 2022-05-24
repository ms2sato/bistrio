import { renderToString, renderToPipeableStream } from 'react-dom/server'
import express from 'express'
import { ActionContext, NullActionContext } from 'restrant2'
import { safeImport } from './safe-import'
import { PageNode } from '../../lib/render-support'
import React from 'react'

type EngineFuncCallback = (err: unknown, rendered?: string | undefined) => void
type EngineFunc = (path: string, options: object, callback: EngineFuncCallback) => void | Promise<void>
type Node = React.FC<unknown>

export type NodeArrangeFunc = (
  node: PageNode,
  options: unknown,
  ctx: ActionContext
) => Promise<JSX.Element> | JSX.Element

type PageExport = {
  Page: Node
}

export const importPage = async (filePath: string) => {
  const ret = (await safeImport(filePath)) as PageExport
  return ret.Page
}

export const engine: (arrange: NodeArrangeFunc) => EngineFunc = (arrange: NodeArrangeFunc) => {
  return async (filePath, options, callback) => {
    try {
      const Page = await importPage(filePath)
      console.warn(
        'Response#render for tsx(set view engine) is low performance, use renderReactViewStream( ex. ctx.render )'
      )
      const node = await arrange(Page, options, new NullActionContext())
      callback(null, renderToString(node)) // Low performance but easy to use without res
    } catch (err) {
      callback(err)
    }
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
