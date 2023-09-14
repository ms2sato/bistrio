import express from 'express'
import internal, { Transform, TransformCallback } from 'stream'
import { StaticRouter } from 'react-router-dom/server'

import { ServerRenderSupport } from './server-render-support'
import { ActionContextImpl } from './server-router-impl'
import { renderToPipeableStream } from 'react-dom/server'
import { isErrorWithCode, isError } from './shared/is-error'
import { NamedResources, RenderSupportContext, toRoutes } from './shared'
import { ActionContextCreator, ConstructViewFunc } from './common'
import createDebug from 'debug'

const debug = createDebug('bistrio:debug:build-action-context-creator')

export function buildActionContextCreator(
  viewRoot: string,
  constructView: ConstructViewFunc,
  failText = '',
): ActionContextCreator {
  return ({ router, req, res, descriptor, httpPath }) => {
    const ctx = new ActionContextImpl(router, req, res, descriptor, httpPath)
    const routes = toRoutes(router.routerCore.routeObject)
    ctx.render = createRenderFunc(constructView, routes, failText)
    return ctx
  }
}

type Stringable = { toString: () => string }
function isStringable(obj: any): obj is Stringable {
  return 'toString' in obj && (obj as Stringable).toString instanceof Function
}

class ScriptInserter<RS extends NamedResources> extends Transform {
  private sentKeys: string[] = []
  constructor(
    private rs: ServerRenderSupport<RS>,
    options?: internal.TransformOptions | undefined,
  ) {
    super(options)
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
    if (isStringable(chunk)) {
      const chnkStr = chunk.toString()
      if (chnkStr.endsWith('</script>')) {
        const entries = Object.entries(this.rs.suspense.readers).filter(
          ([key, reader]) => !this.sentKeys.includes(key) && reader.result !== undefined,
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
  failText = '',
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

function createRenderFunc(constructView: ConstructViewFunc, routes: JSX.Element, failText = '') {
  function render(
    this: ActionContextImpl,
    view: string,
    options: object | undefined,
    callback?: (err: Error, html: string) => void,
  ): void
  function render(this: ActionContextImpl, view: string, callback?: (err: Error, html: string) => void): void
  function render(
    this: ActionContextImpl,
    view: string,
    options: object | undefined | { (err: Error, html: string): void },
    callback?: (err: Error, html: string) => void,
  ): void {
    ;(async () => {
      const hydrate: boolean = this.descriptor.hydrate ?? false
      const rs = new ServerRenderSupport(this)

      const node = await constructView({ routes, hydrate, options, ctx: this, rs }) // TODO: fix node
      debug(`req.originalUrl: %s`, this.req.originalUrl)
      const viewNode = (
        <StaticRouter location={this.req.originalUrl}>
          <RenderSupportContext.Provider value={rs}>{node}</RenderSupportContext.Provider>
        </StaticRouter>
      )

      renderReactViewStream(this.res, viewNode, rs, failText)
    })().catch((err) => {
      let message
      if (isErrorWithCode(err) && err.code == 'ERR_MODULE_NOT_FOUND') {
        message = 'View file not found'
      } else if (isError(err)) {
        message = err.message
      } else {
        message = 'View rendering failed'
      }

      const error = new Error(`${message}; detail '${JSON.stringify(err)}'`)
      if (callback) {
        callback(error, '')
      } else {
        throw error
      }
    })
  }

  return render
}
