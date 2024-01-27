import { join } from 'node:path'
import internal, { Transform, TransformCallback, Writable } from 'node:stream'
import createDebug from 'debug'

import express from 'express'
import { renderToPipeableStream } from 'react-dom/server'

import { ActionDescriptor, NamedResources } from './shared/common.js'
import { isErrorWithCode, isError } from './shared/is-error.js'
import { ConstructViewFunc, ServerRouter } from './common.js'
import { MutableActionContext, RouterCore } from './action-context.js'
import { ServerRenderSupport } from './server-render-support.js'
import { createViewNode } from './express-action-context-view-node.js'
import { toRoutes } from './shared/react-router-util.js'

const debug = createDebug('bistrio:debug:express-action-context')

export class ExpressActionContext implements MutableActionContext {
  private _input: unknown
  private router: ServerRouter
  readonly req: express.Request
  readonly res: express.Response
  readonly descriptor: ActionDescriptor
  readonly httpPath: string
  private readonly constructView: ConstructViewFunc

  constructor({
    router,
    req,
    res,
    descriptor,
    httpPath,
    constructView,
  }: {
    router: ServerRouter
    req: express.Request
    res: express.Response
    descriptor: ActionDescriptor
    httpPath: string
    constructView: ConstructViewFunc
  }) {
    this.router = router
    this.req = req
    this.res = res
    this.descriptor = descriptor
    this.httpPath = httpPath
    this.constructView = constructView
  }

  get params() {
    return this.req.params
  }
  get body() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.req.body
  }
  get query() {
    return this.req.query
  }

  get input() {
    return this._input
  }
  get format() {
    return this.req.params.format
  }
  get httpFilePath() {
    const filePath = this.descriptor.path.endsWith('/') ? `${this.descriptor.path}index` : this.descriptor.path
    return join(this.httpPath, filePath)
  }
  get routePath() {
    return join(this.httpPath, this.descriptor.path)
  }

  resources(): NamedResources {
    return this.router.namedResources(this)
  }

  willRespondJson() {
    const contentType = this.req.get('content-type')
    return this.format === 'json' || (contentType !== undefined && contentType.indexOf('application/json') >= 0)
  }

  async respond(response: Response) {
    response.headers.forEach((value, key) => {
      this.res.setHeader(key, value)
    })

    this.res.status(response.status)
    if (response.redirected) {
      this.res.redirect(response.url)
      return
    }

    if (response.body) {
      await response.body.pipeTo(Writable.toWeb(this.res))
    } else {
      this.res.end()
    }
  }

  async renderRequestedView() {
    try {
      const hydrate: boolean = this.descriptor.hydrate ?? false
      const rs = new ServerRenderSupport(this)
      const routes = toRoutes(this.router.routerCore.routeObject)

      const node = await this.constructView({ routes, hydrate, options: null, ctx: this, rs }) // TODO: fix node
      debug(`req.originalUrl: %s`, this.req.originalUrl)
      const viewNode = createViewNode(this, rs, node)
      renderReactViewStream(this.res, viewNode, rs)
    } catch (err) {
      let message
      if (isErrorWithCode(err) && err.code == 'ERR_MODULE_NOT_FOUND') {
        message = 'View file not found'
      } else if (isError(err)) {
        message = err.message
      } else {
        message = 'View rendering failed'
      }

      throw new Error(`${message}; detail '${JSON.stringify(err)}'`)
    }
  }

  mergeInputs(
    sources: readonly string[],
    pred: (input: Record<string, unknown>, source: string) => Record<string, unknown> = (input) => input,
  ) {
    const request = this.req as unknown as Record<string, Record<string, unknown> | undefined | null>
    const input = sources.reduce((prev, source) => {
      const reqSource = request[source]
      if (reqSource === undefined || reqSource === null) {
        return prev
      }

      return { ...prev, ...pred(reqSource, source) }
    }, {})

    this._input = input
    return input
  }

  getCore(): RouterCore {
    return this.router.routerCore
  }
}

type Stringable = { toString: () => string }
function isStringable(obj: unknown): obj is Stringable {
  const str = obj as Stringable
  return 'toString' in str && str.toString instanceof Function
}

class ScriptInserter<RS extends NamedResources> extends Transform {
  private sentKeys: string[] = []
  constructor(
    private rs: ServerRenderSupport<RS>,
    options?: internal.TransformOptions | undefined,
  ) {
    super(options)
  }

  _transform(chunk: unknown, encoding: BufferEncoding, callback: TransformCallback) {
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
      res.send('<h1>Error on server(Status: 500)</h1>')
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
