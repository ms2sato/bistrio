import path from 'path'
import express from 'express'
import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { ActionContextImpl, ActionContextCreator, ActionContext, NullActionContext, NamedResources } from '..'
import { safeImport } from './safe-import'
import { Localizer } from './shared/locale'
import {
  PageNode,
  RenderSupport,
  suspense,
  createSuspendedResourcesProxy,
  StubResources,
  StubSuspendedResources,
} from './shared/render-support'
import { StaticProps } from '../client'
import { SessionData } from 'express-session'
import { isError, isErrorWithCode } from './is-error'

// import createDebug from 'debug'
// const debug = createDebug('bistrio:react-render-support')

type Node = React.FC<unknown>

export type ConstructViewFunc = (
  node: PageNode,
  hydrate: boolean,
  options: unknown,
  ctx: ActionContext
) => Promise<JSX.Element> | JSX.Element

type PageMaterial = {
  Page: Node
}

export const importPage = async (filePath: string): Promise<PageMaterial> => {
  return (await safeImport(filePath)) as PageMaterial
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
      res.send(`<h1>Error on server(Status: 500)</h1><p>${failText}</p>`)
    },
    onAllReady() {
      // TODO: for crawlers and static generation
    },
    onError(err) {
      // TODO: injectable for logging
      didError = true
      console.error(err)
    },
  })
}

export function createRenderFunc(constructView: ConstructViewFunc, viewRoot: string, failText = '') {
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
    const viewPath = path.join(viewRoot, view)
    importPage(viewPath)
      .then(({ Page }) => {
        if (Page === undefined) {
          throw new Error(`Page is undefined, Must export { Page } on ${viewPath}`)
        }

        const hydrate: boolean = this.descriptor.hydrate ?? false
        return constructView(Page, hydrate, options, this)
      })
      .then((node) => {
        renderReactViewStream(this.res, node, failText)
      })
      .catch((err) => {
        let message
        if (isErrorWithCode(err) && err.code == 'ERR_MODULE_NOT_FOUND') {
          message = 'View file not found'
        } else if (isError(err)) {
          message = err.message
        } else {
          message = 'View rendering failed'
        }

        const error = new Error(`${message}: ${viewPath}; detail '${JSON.stringify(err)}'`)
        if (callback) {
          callback(error, '')
        } else {
          throw error
        }
      })
  }

  return newRender
}

const safeStaticProps = (session: Partial<SessionData>): StaticProps => {
  const sessionProps = session.bistrio
  if (!sessionProps) {
    const sessionProps = { __once: {} }
    session.bistrio = sessionProps
    return sessionProps.__once
  }
  return sessionProps.__once
}

export type BuildActionContextCreator = (
  viewRoot: string,
  arrange: ConstructViewFunc,
  failText: string
) => ActionContextCreator

export function buildActionContextCreator(
  viewRoot: string,
  constructView: ConstructViewFunc,
  failText = ''
): ActionContextCreator {
  return (props) => {
    const ctx = new ActionContextImpl(props.router, props.req, props.res, props.descriptor, props.httpPath)
    ctx.render = createRenderFunc(constructView, viewRoot, failText)
    return ctx
  }
}

export function createRenderSupport<RS extends NamedResources>(
  ctx: ActionContext = new NullActionContext()
): ServerRenderSupport<RS> {
  const rs = new ServerRenderSupport<RS>(ctx)
  const bistrioSession = ctx.req.session.bistrio
  if (bistrioSession) {
    bistrioSession.__once = {}
  }
  return rs
}

export class ServerRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  readonly suspense
  private session

  readonly isClient: boolean = false
  readonly isServer: boolean = true

  constructor(private ctx: ActionContext) {
    this.suspense = suspense()
    this.session = { ...this.ctx.req.session, bistrio: { ...(this.ctx.req.session.bistrio || { __once: {} }) } } // for session.destroy() on streaming
  }

  getLocalizer(): Localizer {
    const localizer = this.ctx.req.localizer
    if (!localizer) {
      throw new Error('Unexpected call getLocalizer: Must use localeMiddleware')
    }
    return localizer
  }

  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    return this.suspense.suspend(asyncProcess, key)
  }

  resources(): StubResources<RS> {
    const ret = this.ctx.resources()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret as StubResources<RS>
  }

  suspendedResources(): StubSuspendedResources<RS> {
    return createSuspendedResourcesProxy(this) as StubSuspendedResources<RS>
  }

  get params() {
    return this.ctx.params
  }

  getStaticProps(): StaticProps {
    return safeStaticProps(this.session)
  }
}
