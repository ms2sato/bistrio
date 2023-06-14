import path from 'path'
import internal, { Transform, TransformCallback } from 'stream'
import express from 'express'
import React from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { ActionContextImpl, ActionContextCreator, ActionContext, NamedResources } from '..'
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
import { isError, isErrorWithCode } from './is-error'

// import createDebug from 'debug'
// const debug = createDebug('bistrio:react-render-support')

type Node = React.FC<unknown>

export type ConstructViewFunc = (props: {
  node: PageNode
  hydrate: boolean
  options: unknown
  rs: RenderSupport<any>
  ctx: ActionContext
}) => Promise<JSX.Element> | JSX.Element

type PageMaterial = {
  Page: Node
}

export const importPage = async (filePath: string): Promise<PageMaterial> => {
  return (await safeImport(filePath)) as PageMaterial
}

type Stringable = { toString: () => string }
function isStringable(obj: any): obj is Stringable {
  return 'toString' in obj && (obj as Stringable).toString instanceof Function
}

class ScriptInserter<RS extends NamedResources> extends Transform {
  private sentKeys: string[] = []
  constructor(private rs: ServerRenderSupport<RS>, options?: internal.TransformOptions | undefined) {
    super(options)
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
    if (isStringable(chunk)) {
      const chnkStr = chunk.toString()
      if (chnkStr.endsWith('</script>')) {
        const entries = Object.entries(this.rs.suspense.readers).filter(
          ([key, reader]) => !this.sentKeys.includes(key) && reader.result !== undefined
        )
        if (entries.length > 0) {
          const scripts = entries
            .map(([key, reader]) => {
              this.sentKeys.push(key)
              const record = { key, data: reader.result }
              return `<script>window.BISTRIO.addCache(${JSON.stringify(record)})</script>`
            })
            .join('')
          this.push(chnkStr + scripts)
          callback()
          return
        }
      }
    }

    this.push(chunk)
    callback()
  }
}

// @see https://reactjs.org/docs/react-dom-server.html#rendertopipeablestream
function renderReactViewStream<RS extends NamedResources>(
  res: express.Response,
  node: React.ReactNode,
  rs: ServerRenderSupport<RS>,
  failText = ''
) {
  let didError = false
  const scriptInserter = new ScriptInserter(rs)
  const stream = renderToPipeableStream(node, {
    onShellReady() {
      res.statusCode = didError ? 500 : 200
      res.setHeader('Content-type', 'text/html; charset=UTF-8')
      stream.pipe(scriptInserter).pipe(res)
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

function createRenderFunc(constructView: ConstructViewFunc, viewRoot: string, failText = '') {
  function render(
    this: ActionContextImpl,
    view: string,
    options: object | undefined,
    callback?: (err: Error, html: string) => void
  ): void
  function render(this: ActionContextImpl, view: string, callback?: (err: Error, html: string) => void): void
  function render(
    this: ActionContextImpl,
    view: string,
    options: object | undefined | { (err: Error, html: string): void },
    callback?: (err: Error, html: string) => void
  ): void {
    const viewPath = path.join(viewRoot, view)
    ;(async () => {
      const { Page } = await importPage(viewPath)
      if (Page === undefined) {
        throw new Error(`Page is undefined, Must export { Page } on ${viewPath}`)
      }
      const hydrate: boolean = this.descriptor.hydrate ?? false
      const rs = createRenderSupport(this)
      const node = await constructView({ node: Page, hydrate, options, ctx: this, rs })
      renderReactViewStream(this.res, node, rs, failText)
    })().catch((err) => {
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

  return render
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

function createRenderSupport<RS extends NamedResources>(ctx: ActionContext): ServerRenderSupport<RS> {
  return new ServerRenderSupport<RS>(ctx)
}

export class ServerRenderSupport<RS extends NamedResources> implements RenderSupport<RS> {
  readonly suspense

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
}
