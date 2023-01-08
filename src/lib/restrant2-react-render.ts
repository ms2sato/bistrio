import path from 'path'
import express from 'express'
import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import {
  ActionContextImpl,
  ActionContextCreator,
  ActionContext,
  NullActionContext,
  NamedResources,
  ServerRouter,
  ActionDescriptor,
  ValidationError,
} from 'restrant2'
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

type Node = React.FC<unknown>

export type ConstructViewFunc<RS extends NamedResources> = (
  node: PageNode<RS>,
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
  constructView: ConstructViewFunc<RS>,
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
    const viewPath = path.join(viewRoot, view)
    importPage(viewPath)
      .then(({ Page, hydrate }) => {
        if (Page === undefined) {
          throw new Error(`Page is undefined, Must export { Page } on ${viewPath}`)
        }

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

export type BuildActionContextCreator<RS extends NamedResources> = (
  viewRoot: string,
  arrange: ConstructViewFunc<RS>,
  failText: string
) => ActionContextCreator

class BistrioActionContext extends ActionContextImpl {
  constructor(
    router: ServerRouter,
    req: express.Request,
    res: express.Response,
    descriptor: ActionDescriptor,
    httpPath: string
  ) {
    super(router, req, res, descriptor, httpPath)
  }

  responseInvalid(path: string, error: ValidationError, source: unknown): void {
    const staticProps = safeStaticProps(this.req.session)
    staticProps.invalidState = { error, source }
    this.redirect(path)
  }
}

export function buildActionContextCreator<RS extends NamedResources>(
  viewRoot: string,
  constructView: ConstructViewFunc<RS>,
  failText = ''
): ActionContextCreator {
  return (props) => {
    const ctx = new BistrioActionContext(props.router, props.req, props.res, props.descriptor, props.httpPath)
    ctx.render = createRenderFunc(constructView, viewRoot, failText)
    return ctx
  }
}

export function createRenderSupport<RS extends NamedResources>(ctx: ActionContext = new NullActionContext()) {
  const rs = new ServerRenderSupport<RS>(ctx)
  const bistrioSession = ctx.req.session.bistrio
  if (bistrioSession) {
    bistrioSession.__once = {}
  }
  return rs
}

class ServerRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  private suspense
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

  fetchJson<T>(url: string, key: string = url): T {
    return this.suspense.fetchJson(url, key)
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

  get invalidState() {
    return this.getStaticProps().invalidState
  }

  invalidStateOrDefault<S>(source: S) {
    // TODO: fix types
    const inv = this.invalidState
    return inv ? { error: inv.error, source: inv.source as S } : { source }
  }

  getStaticProps(): StaticProps {
    return safeStaticProps(this.session)
  }
}
