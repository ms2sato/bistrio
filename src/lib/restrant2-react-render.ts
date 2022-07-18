import path from 'path'
import express from 'express'
import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import {
  ActionContextImpl,
  ActionContextCreator,
  createDefaultActionContext,
  ActionContext,
  NullActionContext,
  NamedResources,
} from 'restrant2'
import { safeImport } from './safe-import'
import { Localizer } from './shared/locale'
import { PageNode, RenderSupport, suspense } from './shared/render-support'

type Node = React.FC<unknown>

export type NodeArrangeFunc<RC extends NamedResources> = (
  node: PageNode<RC>,
  hydrate: boolean,
  options: unknown,
  ctx: ActionContext
) => Promise<JSX.Element> | JSX.Element

type PageExport = {
  Page: Node
  hydrate: boolean
}

export const importPage = async (filePath: string): Promise<PageExport> => {
  return (await safeImport(filePath)) as PageExport
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

export function createRenderFunc<RS extends NamedResources>(
  arrange: NodeArrangeFunc<RS>,
  viewRoot: string,
  failText = ''
) {
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
      .then(({ Page, hydrate }) => {
        return arrange(Page, hydrate, options, this)
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

export type BuildActionContextCreator<RS extends NamedResources> = (
  viewRoot: string,
  arrange: NodeArrangeFunc<RS>,
  failText: string
) => ActionContextCreator

export function buildActionContextCreator<RS extends NamedResources>(
  viewRoot: string,
  arrange: NodeArrangeFunc<RS>,
  failText = ''
): ActionContextCreator {
  return (props) => {
    const ctx = createDefaultActionContext(props)
    ctx.render = createRenderFunc(arrange, viewRoot, failText)
    return ctx
  }
}

export function createRenderSupport<RS extends NamedResources>(ctx: ActionContext = new NullActionContext()) {
  return new ServerRenderSupport<RS>(ctx)
}

class ServerRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  private suspense

  readonly isClient: boolean = false
  readonly isServer: boolean = true

  constructor(private ctx: ActionContext) {
    this.suspense = suspense()
  }

  getLocalizer(): Localizer {
    const localizer = this.ctx.req.localizer
    if (!localizer) {
      throw new Error('Unexpected call getLocalizer: Must use localeMiddleware')
    }
    return localizer
  }

  fetchJson<T>(url: string, key: string = url): T {
    return this.suspense.fetchJson(url, key)
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }

  resources(): RS {
    const ret = this.ctx.resources()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret as RS
  }

  get params() {
    return this.ctx.params
  }

  get invalid() {
    return this.getStaticProps().invalid
  }

  private getStaticProps() {
    const staticProps = this.ctx.req.session.bistrio
    if (!staticProps) {
      return (this.ctx.req.session.bistrio = {})
    }
    return staticProps
  }
}
