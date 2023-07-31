import express, { NextFunction, RequestHandler } from 'express'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import debug from 'debug'
import {
  ActionContext,
  ActionDescriptor,
  Actions,
  ActionSupport,
  ConstructConfig,
  ConstructDescriptor,
  ConstructSource,
  CreateActionOptionFunction,
  Handler,
  InputArranger,
  Renderer,
  Adapter,
  ResourceSupport,
  RouteConfig,
  Router,
  RouterError,
  RequestCallback,
  parseFormBody,
  createZodTraverseArrangerCreator,
  SchemaUtil,
  Responder,
  HandlerBuildRunner,
  Resource,
  EndpointFunc,
  ValidationError,
  ResourceMethod,
  MutableActionContext,
  NamedResources,
  choiceSchema,
  choiseSources,
  blankSchema,
  PartialWithRequired,
  StandardJsonFormatter,
  JsonFormatter,
} from '..'
import { HttpMethod, RouterOptions, opt } from './shared'

const log = debug('restrant2')
const routeLog = log.extend('route')
const handlerLog = log.extend('handler')

export type ActionContextProps = {
  router: ServerRouter
  req: express.Request
  res: express.Response
  descriptor: ActionDescriptor
  httpPath: string
}

export type ActionContextCreator = (props: ActionContextProps) => MutableActionContext

export type ResourceMethodHandlerParams = {
  resourceMethod: ResourceMethod
  resource: Resource
  sources: readonly ConstructSource[]
  router: ServerRouter
  httpPath: string
  schema: z.AnyZodObject
  adapterPath: string
  actionDescriptor: ActionDescriptor
  responder: Responder | RequestCallback
  adapter: Adapter
}

export type ServerRouterConfig = {
  baseDir: string
  actions: readonly ActionDescriptor[]
  inputArranger: InputArranger
  createActionOptions: CreateActionOptionFunction
  createActionContext: ActionContextCreator
  constructConfig: ConstructConfig
  createDefaultResponder: (params: ResourceMethodHandlerParams) => Required<Responder>
  renderDefault: Renderer
  adapterRoot: string
  adapterFileName: string
  resourceRoot: string
  resourceFileName: string
}

export function arrangeFormInput(ctx: MutableActionContext, sources: readonly string[], schema: z.AnyZodObject) {
  return parseFormBody(ctx.mergeInputs(sources), createZodTraverseArrangerCreator(schema))
}

export function arrangeJsonInput(ctx: MutableActionContext, sources: readonly string[], schema: z.AnyZodObject) {
  const pred = (input: Record<string, unknown>, source: string) => {
    return source === 'body' ? input : SchemaUtil.deepCast(schema, input)
  }
  return ctx.mergeInputs(sources, pred)
}

export type ContentArranger = {
  (ctx: MutableActionContext, sources: readonly string[], schema: z.AnyZodObject): unknown
}

type ContentType2Arranger = Record<string, ContentArranger>

export type ServerRouterConfigCustom = PartialWithRequired<ServerRouterConfig, 'baseDir'>

export const defaultContentType2Arranger: ContentType2Arranger = {
  'application/json': arrangeJsonInput,
  'application/x-www-form-urlencoded': arrangeFormInput,
  'multipart/form-data': arrangeFormInput,
  '': arrangeFormInput,
}

export const createSmartInputArranger = (contentType2Arranger: ContentType2Arranger = defaultContentType2Arranger) => {
  return (ctx: MutableActionContext, sources: readonly string[], schema: z.AnyZodObject) => {
    const requestedContentType = ctx.req.headers['content-type']
    if (requestedContentType) {
      for (const [contentType, contentArranger] of Object.entries<ContentArranger>(contentType2Arranger)) {
        if (contentType === '') continue
        if (requestedContentType.indexOf(contentType) >= 0) {
          return contentArranger(ctx, sources, schema)
        }
      }
    }
    return contentType2Arranger[''](ctx, sources, schema) // TODO: overwritable
  }
}

type ContextHolder = {
  ctx: ActionContext
}

function isContextHolder(obj: unknown): obj is ContextHolder {
  return (obj as ContextHolder).ctx !== undefined && typeof (obj as ContextHolder).ctx === 'object'
}

// FIXME: @see https://google.github.io/styleguide/jsoncstyleguide.xml
class StandardJsonResponder<Opt = undefined, Out = unknown, Src = unknown> implements Responder<Opt, Out, Src> {
  constructor(private jsonFormatter: JsonFormatter = new StandardJsonFormatter()) {}

  success(ctx: ActionContext, output: Out): void | Promise<void> {
    let ret
    if (output === undefined || output === null) {
      ret = this.jsonFormatter.success(output)
    } else if (isContextHolder(output)) {
      const data = { ...output }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ctx, ...dataWithoutCtx } = data
      ret = this.jsonFormatter.success(dataWithoutCtx)
    } else {
      ret = this.jsonFormatter.success(output)
    }
    ctx.res.status(ret.status)
    ctx.res.json(ret.json)
  }

  invalid(ctx: ActionContext, validationError: ValidationError, _source: Src): void | Promise<void> {
    const ret = this.jsonFormatter.invalid(validationError)
    ctx.res.status(ret.status)
    ctx.res.json(ret.json)
  }

  fatal(ctx: ActionContext, err: Error): void | Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      const ret = this.jsonFormatter.fatal(err)
      ctx.res.status(ret.status)
      ctx.res.json(ret.json)
    } else {
      throw err
    }
  }
}

type FatalHandler = (ctx: ActionContext, err: Error) => void

class SmartResponder<Opt = undefined, Out = unknown, Src = unknown> implements Responder<Opt, Out, Src> {
  constructor(
    private router: ServerRouter,
    private fatalHandler: FatalHandler,
    private jsonResonder = new StandardJsonResponder(),
  ) {}

  success(ctx: ActionContext, output: Out): void | Promise<void> {
    if (ctx.willRespondJson()) {
      return this.jsonResonder.success(ctx, output)
    }

    if (this.router.serverRouterConfig.renderDefault(ctx, output) === false) {
      return this.jsonResonder.success(ctx, output)
    }
  }

  invalid(ctx: ActionContext, validationError: ValidationError, source: Src): void | Promise<void> {
    return this.jsonResonder.invalid(ctx, validationError, source)
  }

  fatal(ctx: ActionContext, err: Error): void | Promise<void> {
    console.error('fatal', err)
    if (ctx.willRespondJson()) {
      return this.jsonResonder.fatal(ctx, err)
    }

    this.fatalHandler(ctx, err)
  }
}

const createSmartResponder = ({ router }: ResourceMethodHandlerParams) => {
  return new SmartResponder(
    router,
    () => {
      throw new Error('Unimplemented Fatal Handler')
    },
    new StandardJsonResponder(),
  )
}

const createResourceMethodHandler = (params: ResourceMethodHandlerParams): express.Handler => {
  const {
    resourceMethod,
    resource,
    sources,
    router,
    httpPath,
    schema,
    adapterPath,
    actionDescriptor,
    responder,
    adapter,
  } = params

  const serverRouterConfig = router.serverRouterConfig
  const defaultResponder = serverRouterConfig.createDefaultResponder(params)
  const actionName = actionDescriptor.action

  const respond = async (ctx: ActionContext, output: unknown, option: unknown) => {
    if (responder && 'success' in responder) {
      handlerLog('%s#%s.success', adapterPath, actionName)
      const ret = await responder.success?.apply(adapter, [ctx, output, option])
      if (ret === false) {
        handlerLog(' dispatch to default responder')
        defaultResponder.success(ctx, output)
      } else if (ret !== undefined) {
        handlerLog(' dispatch to default responder for ret value')
        defaultResponder.success(ctx, ret)
      }
    } else {
      handlerLog('%s#%s success by default responder', adapterPath, actionName)
      defaultResponder.success(ctx, output)
    }
  }

  const handleFatal = async (ctx: ActionContext, err: Error, option: unknown, next: NextFunction) => {
    if (responder && 'fatal' in responder) {
      try {
        handlerLog('%s#%s.fatal', adapterPath, actionName)
        await responder.fatal?.apply(adapter, [ctx, err, option])
      } catch (er) {
        console.error('Unexpected Error on responder.fatal, dispatch to default responder', er)
        await defaultResponder.fatal(ctx, err)
      }
    } else {
      return next(err)
    }
  }

  return (req, res, next) => {
    ;(async () => {
      const ctx = serverRouterConfig.createActionContext({ router, req, res, descriptor: actionDescriptor, httpPath })
      const option = await serverRouterConfig.createActionOptions(ctx, actionDescriptor)

      const wrappedOption = new opt(option)
      if (schema == blankSchema) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const output = await resourceMethod.apply(resource, [wrappedOption])
        await respond(ctx, output, option)
      } else {
        try {
          let source = serverRouterConfig.inputArranger(ctx, sources, schema)
          handlerLog('source: %o', source)

          try {
            if (responder && 'beforeValidation' in responder) {
              source = await responder.beforeValidation?.(ctx, source, schema)
            }

            let input: { [x: string]: unknown } = schema.parse(source)
            if (responder && 'afterValidation' in responder) {
              input = (await responder.afterValidation?.(ctx, input, schema)) as { [x: string]: unknown }
            }

            handlerLog('input', input)
            if (input) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const output = await resourceMethod.apply(resource, [input, wrappedOption])
              await respond(ctx, output, option)
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const output = await resourceMethod.apply(resource, [wrappedOption])
              await respond(ctx, output, option)
            }
          } catch (err) {
            if (err instanceof z.ZodError) {
              const validationError = err
              handlerLog.extend('debug')('%s#%s validationError %s', adapterPath, actionName, validationError.message)
              if (responder) {
                if ('invalid' in responder) {
                  if (!responder.invalid) {
                    throw new Error('Unreachable: invalid in responder is not implemented')
                  }

                  const filledSource = SchemaUtil.fillDefault(schema, source)
                  handlerLog('%s#%s.invalid', adapterPath, actionName, filledSource)
                  res.status(422)
                  await responder.invalid.apply(adapter, [ctx, validationError, filledSource, option])
                } else {
                  next(validationError)
                }
              } else {
                handlerLog('%s#%s invalid by default responder', adapterPath, actionName)
                await defaultResponder.invalid(ctx, validationError, source)
              }
            } else {
              await handleFatal(ctx, err as Error, option, next)
            }
          }
        } catch (err) {
          return await handleFatal(ctx, err as Error, option, next)
        }
      }
    })().catch((err) => {
      next(err)
    })
  }
}

export const createNullActionOption: CreateActionOptionFunction = (_ctx, _ad) => {
  return Promise.resolve(undefined)
}

export function renderDefault(ctx: ActionContext, options: unknown = undefined) {
  if (!ctx.descriptor.page) {
    return false
  }

  const viewPath = ctx.httpFilePath.replace(/^\//, '')
  handlerLog('renderDefault: %s', viewPath)

  // as object for Express
  ctx.render(viewPath, options as object)
}

class FileNotFoundError extends Error {}

export const importAndSetup = async <S, R>(
  fileRoot: string,
  modulePath: string,
  support: S,
  config: RouteConfig,
): Promise<R> => {
  let fullPath = path.join(fileRoot, modulePath)

  if (process.env.NODE_ENV == 'development') {
    let ret
    try {
      // for ts-node dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ret = require(fullPath) as { default: EndpointFunc<S, R> }
    } catch (err) {
      if (
        !fs.existsSync(fullPath) &&
        !fs.existsSync(`${fullPath}.ts`) &&
        !fs.existsSync(`${fullPath}.tsx`) &&
        !fs.existsSync(`${fullPath}.js`)
      ) {
        throw new FileNotFoundError(`module: '${fullPath}' is not found`)
      }
      throw err
    }

    try {
      return ret.default(support, config)
    } catch (err) {
      if (err instanceof Error) {
        throw new RouterError(`Error occured "${err.message}" on calling default function in "${modulePath}"`, {
          cause: err,
        })
      } else {
        throw new TypeError(`Unexpected Error Object: ${err as string}`, { cause: err })
      }
    }
  } else {
    if (!fullPath.endsWith('.js')) {
      fullPath = `${fullPath}.js`
    }

    if (!fs.existsSync(fullPath)) {
      throw new FileNotFoundError(`module: '${fullPath}' is not found`)
    }

    const ret = (await import(fullPath)) as { default: EndpointFunc<S, R> }
    try {
      return ret.default(support, config)
    } catch (err) {
      if (err instanceof Error) {
        throw new RouterError(`Error occured "${err.message}" on calling default function in "${modulePath}"`, {
          cause: err,
        })
      } else {
        throw new TypeError(`Unexpected Error Object: ${err as string}`)
      }
    }
  }
}

export const createDefaultActionContext: ActionContextCreator = ({ router, req, res, descriptor, httpPath }) => {
  return new ActionContextImpl(router, req, res, descriptor, httpPath)
}

export class ActionContextImpl implements MutableActionContext {
  render
  redirect
  private _input: unknown

  constructor(
    private router: ServerRouter,
    readonly req: express.Request,
    readonly res: express.Response,
    readonly descriptor: ActionDescriptor,
    readonly httpPath: string,
  ) {
    // @see https://stackoverflow.com/questions/47647709/method-alias-with-typescript
    this.render = this.res.render.bind(this.res)
    this.redirect = this.res.redirect.bind(this.res)
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
    return path.join(this.httpPath, filePath)
  }
  get routePath() {
    return path.join(this.httpPath, this.descriptor.path)
  }

  resources(): NamedResources {
    return this.router.namedResources(this)
  }

  willRespondJson() {
    const contentType = this.req.headers['content-type']
    return this.format === 'json' || (contentType !== undefined && contentType.indexOf('application/json') >= 0)
  }

  mergeInputs(
    sources: readonly string[],
    pred: (input: Record<string, unknown>, source: string) => Record<string, unknown> = (input) => input,
  ) {
    const request = this.req as unknown as Record<string, Record<string, unknown>>
    const input = sources.reduce((prev, source) => {
      if (request[source] === undefined) {
        return prev
      }

      return { ...prev, ...pred(request[source], source) }
    }, {})

    this._input = input
    return input
  }
}

function defaultServerRouterConfig(): Omit<ServerRouterConfig, 'baseDir'> {
  return {
    actions: Actions.page(),
    inputArranger: createSmartInputArranger(),
    createActionOptions: createNullActionOption,
    createActionContext: createDefaultActionContext,
    constructConfig: Actions.defaultConstructConfig(),
    createDefaultResponder: createSmartResponder,
    renderDefault: renderDefault,
    adapterRoot: './endpoint',
    adapterFileName: 'adapter',
    resourceRoot: './endpoint',
    resourceFileName: 'resource',
  }
}

export function fillServerRouterConfig(serverRouterConfig: ServerRouterConfigCustom): ServerRouterConfig {
  return Object.assign(defaultServerRouterConfig(), serverRouterConfig)
}

export type RouterCore = {
  handlerBuildRunners: HandlerBuildRunner[]
  nameToResource: Map<string, ResourceConstructor>
  nameToPath: Map<string, string>
}

export abstract class BasicRouter implements Router {
  readonly serverRouterConfig: ServerRouterConfig

  constructor(
    serverRouterConfig: ServerRouterConfigCustom = { baseDir: './' },
    readonly httpPath: string = '/',
    protected readonly routerCore: RouterCore = {
      handlerBuildRunners: [],
      nameToResource: new Map(),
      nameToPath: new Map(),
    },
  ) {
    this.serverRouterConfig = fillServerRouterConfig(serverRouterConfig)
  }

  abstract sub(...args: unknown[]): Router
  abstract options(value: RouterOptions): Router

  protected abstract createHandlerBuildRunner(rpath: string, routeConfig: RouteConfig): HandlerBuildRunner

  resources(rpath: string, config: RouteConfig): void {
    this.routerCore.handlerBuildRunners.push(this.createHandlerBuildRunner(rpath, config))
  }

  async build() {
    for (const requestHandlerSources of this.routerCore.handlerBuildRunners) {
      await requestHandlerSources()
    }
  }

  protected getHttpPath(rpath: string) {
    return path.join(this.httpPath, rpath)
  }

  protected getResourcePath(rpath: string) {
    return path.join(
      this.serverRouterConfig.resourceRoot,
      this.getHttpPath(rpath),
      this.serverRouterConfig.resourceFileName,
    )
  }

  protected getAdapterPath(rpath: string) {
    return path.join(
      this.serverRouterConfig.adapterRoot,
      this.getHttpPath(rpath),
      this.serverRouterConfig.adapterFileName,
    )
  }
}

type ResourceConstructor = (ctx: ActionContext) => Resource

export const createLocalResourceProxy = (
  serverRouterConfig: ServerRouterConfig,
  config: RouteConfig,
  resource: Resource,
): ResourceConstructor => {
  return (ctx) => {
    const resourceProxy: Resource = {}
    for (const actionName in resource) {
      const resourceMethod = resource[actionName]
      const cad: ConstructDescriptor | undefined = config.construct?.[actionName]
      const actionDescriptor = config.actions?.find((action) => action.action === actionName)
      if (!actionDescriptor) {
        continue
      }

      if (cad?.schema) {
        const schema = cad.schema
        resourceProxy[actionName] = async function (...args) {
          const option = await serverRouterConfig.createActionOptions(ctx, actionDescriptor)
          const wrappedOption = new opt(option)

          if (args.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return resourceMethod.apply(resource, [wrappedOption])
          } else {
            schema.parse(args[0]) // if throw error, args[0] is unexpected

            // TOOD: typesafe
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
            return resourceMethod.apply(resource, [...args, wrappedOption])
          }
        }
      } else {
        resourceProxy[actionName] = async function () {
          const option = await serverRouterConfig.createActionOptions(ctx, actionDescriptor)
          const wrappedOption = new opt(option)

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return resourceMethod.apply(resource, [wrappedOption])
        }
      }
    }

    return resourceProxy
  }
}

// export const createLocalResourceProxy = (config: RouteConfig, resource: Resource): ResourceConstructor => {
//   return (ctx) => {
//     const resourceProxy: Resource = {}
//     for (const actionName in resource) {
//       const resourceMethod = resource[actionName]
//       const cad: ConstructDescriptor | undefined = config.construct?.[actionName]
//       if (cad?.schema) {
//         const schema = cad.schema
//         resourceProxy[actionName] = function (...args) {

//           const option = await serverRouterConfig.createActionOptions(ctx, httpPath, actionDescriptor)

//           const wrappedOption = new opt(option)

//           if (args.length === 0) {
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//             return resourceMethod.apply(resource)
//           } else if (args[0] instanceof opt) {
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//             return resourceMethod.apply(resource, [args[0]])
//           } else {
//             const parsedInput = schema.parse(args[0])
//             if (parsedInput === undefined) {
//               throw new Error('UnexpectedInput')
//             }
//             // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//             return resourceMethod.apply(resource, args)
//           }
//         }
//       } else {
//         resourceProxy[actionName] = function (option) {
//           // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//           return resourceMethod.apply(resource, [option])
//         }
//       }
//     }

//     return resourceProxy
//   }
// }

type Thenable = {
  then: (onfulfilled: (value: unknown) => unknown) => Thenable
  catch: (onrejected: (reason: unknown) => unknown) => Thenable
}

function isThenable(obj: unknown): obj is Thenable {
  return (obj as Thenable).then !== undefined && typeof (obj as Thenable).then === 'function'
}

type RoutingMethod = (urlPath: string, ...params: express.Handler[]) => void
type RoutingMethodHolder = { [method: string]: RoutingMethod }

function hasRoutingMethod(router: unknown, method: HttpMethod): router is RoutingMethodHolder {
  return router instanceof Object && (router as RoutingMethodHolder)[method] instanceof Function
}

export class ServerRouter extends BasicRouter {
  readonly router: express.Router

  constructor(
    serverRouterConfig: ServerRouterConfigCustom = { baseDir: './' },
    httpPath = '/',
    readonly routerCore: RouterCore = { handlerBuildRunners: [], nameToResource: new Map(), nameToPath: new Map() },
    private routerOptions: RouterOptions = { hydrate: false },
  ) {
    super(serverRouterConfig, httpPath, routerCore)
    this.router = express.Router({ mergeParams: true })
  }

  sub(rpath: string, ...handlers: RequestHandler[]) {
    // TODO: impl class SubServerRouter without build
    const subRouter = new ServerRouter(this.serverRouterConfig, path.join(this.httpPath, rpath), this.routerCore, {
      ...this.routerOptions,
    })

    this.router.use(rpath, ...[...handlers, subRouter.router])
    return subRouter
  }

  options(value: RouterOptions) {
    this.routerOptions = value
    return this
  }

  namedResources(ctx: ActionContext): NamedResources {
    // TODO: optimize
    const ret: NamedResources = {}
    for (const [name, resourceConstructor] of this.routerCore.nameToResource) {
      ret[name] = resourceConstructor(ctx)
    }
    return ret
  }

  // protected for test
  protected async loadResource(resourcePath: string, routeConfig: RouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    return await importAndSetup<ResourceSupport, Resource>(
      fileRoot,
      resourcePath,
      new ResourceSupport(fileRoot),
      routeConfig,
    )
  }

  protected async loadAdapter(adapterPath: string, routeConfig: RouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    return await importAndSetup<ActionSupport, Adapter>(fileRoot, adapterPath, new ActionSupport(fileRoot), routeConfig)
  }

  protected createHandlerBuildRunner(rpath: string, routeConfig: RouteConfig): HandlerBuildRunner {
    const isPageOnly = routeConfig.actions?.every((action) => action.page) && true

    return async () => {
      handlerLog('buildHandler: %s', path.join(this.httpPath, rpath))

      const resourcePath = this.getResourcePath(rpath)
      const resourceName = routeConfig.name
      if (this.routerCore.nameToResource.get(resourceName)) {
        throw new Error(
          `Duplicated Resource Name: ${resourceName}; path: ${resourcePath}, with: ${
            this.routerCore.nameToPath.get(resourceName) ?? 'unknown'
          }`,
        )
      }

      let resource
      try {
        resource = await this.loadResource(resourcePath, routeConfig)
      } catch (err) {
        if (!(err instanceof FileNotFoundError) || !isPageOnly) {
          throw err
        }
      }

      if (resource) {
        console.log('resourcePath', resourcePath)
        this.routerCore.nameToResource.set(
          resourceName,
          createLocalResourceProxy(this.serverRouterConfig, routeConfig, resource),
        )
      }

      this.routerCore.nameToPath.set(resourceName, resourcePath)

      const adapterPath = this.getAdapterPath(rpath)
      let adapter: Adapter

      try {
        adapter = await this.loadAdapter(adapterPath, routeConfig)
      } catch (err) {
        if (err instanceof FileNotFoundError) {
          adapter = {}
        } else {
          throw err
        }
      }

      const actionDescriptors: readonly ActionDescriptor[] = routeConfig.actions || this.serverRouterConfig.actions

      for (const actionDescriptor of actionDescriptors) {
        if (actionDescriptor.page && actionDescriptor.hydrate === undefined) {
          actionDescriptor.hydrate = this.routerOptions.hydrate
        }

        const actionName = actionDescriptor.action
        const resourceHttpPath = this.getHttpPath(rpath)

        const resourceMethod: ResourceMethod | undefined = resource?.[actionName]
        const actionFunc: Handler | Responder | RequestCallback | undefined = adapter[actionName]
        const constructDescriptor: ConstructDescriptor | undefined = routeConfig.construct?.[actionName]

        const actionOverride = actionFunc instanceof Function
        if (!actionOverride) {
          if (resourceMethod === undefined && !actionDescriptor.page) {
            throw new RouterError(
              `Logic not found! define action.page option on routes, or define ${resourcePath}#${actionName} or/and ${adapterPath}#${actionName}`,
            )
          }
        }

        if (actionOverride && resourceMethod !== undefined) {
          routeLog.extend('warn')(
            `${resourcePath}#${actionName} is defined but will not be called auto. Responder support auto call; proposal: 'Remove ${resourcePath}#${actionName}' or 'Change to Responder(not Function) ${adapterPath}/#${actionName}' or 'Remove ${adapterPath}/#${actionName}'`,
          )
        }

        const schema: z.AnyZodObject | undefined =
          resourceMethod === undefined
            ? undefined
            : choiceSchema(this.serverRouterConfig.constructConfig, constructDescriptor, actionName)

        let params
        if (actionOverride) {
          handlerLog('%s#%s without construct middleware', adapterPath, actionName)
          const handler: express.Handler = (req, res, next) => {
            const ctx = this.serverRouterConfig.createActionContext({
              router: this,
              req,
              res,
              descriptor: actionDescriptor,
              httpPath: resourceHttpPath,
            })
            try {
              handlerLog('%s#%s as Handler', adapterPath, actionName)
              const ret = actionFunc(ctx)
              if (isThenable(ret)) {
                ret.catch(next)
              }
            } catch (err) {
              next(err)
            }
          }

          params = [handler]
        } else {
          if (!resourceMethod) {
            if (!actionDescriptor.page) {
              throw new Error('Unreachable: resourceMethod is undefined and action.page not set')
            }

            const handler: express.Handler = (req, res, next) => {
              const ctx = this.serverRouterConfig.createActionContext({
                router: this,
                req,
                res,
                descriptor: actionDescriptor,
                httpPath: resourceHttpPath,
              })
              try {
                handlerLog('page: %s', ctx.httpFilePath)
                this.serverRouterConfig.renderDefault(ctx)
              } catch (err) {
                next(err)
              }
            }

            params = [handler]
          } else {
            if (!schema) {
              throw new Error('Unreachable: schema is undefined')
            }

            if (!resource) {
              throw new Error('Unreachable: resource is undefined')
            }

            const sources = choiseSources(this.serverRouterConfig.constructConfig, constructDescriptor, actionName)
            handlerLog(
              '%s#%s  with construct middleware; schema: %s, sources: %o',
              adapterPath,
              actionName,
              schema.constructor.name,
              sources,
            )

            const handler: express.Handler = createResourceMethodHandler({
              resourceMethod,
              resource,
              sources,
              router: this,
              httpPath: resourceHttpPath,
              schema,
              adapterPath,
              actionDescriptor,
              responder: actionFunc,
              adapter,
            })
            params = [handler]
          }
        }

        const urlPath = path.join(rpath, actionDescriptor.path)
        routeLog(
          '%s %s\t%s\t{actionOverride:%s, resourceMethod:%s, page: %s, hydrate: %s}',
          actionDescriptor.method instanceof Array ? actionDescriptor.method.join(',') : actionDescriptor.method,
          path.join(this.httpPath, urlPath),
          actionName,
          actionOverride,
          !!resourceMethod,
          actionDescriptor.page,
          actionDescriptor.hydrate,
        )

        const urlPathWithExt = `${urlPath.replace(/\/$/, '')}.:format?`
        if (actionDescriptor.method instanceof Array) {
          for (const method of actionDescriptor.method) {
            const router = this.router as unknown
            if (hasRoutingMethod(router, method)) {
              router[method](urlPathWithExt, ...params)
            } else {
              throw new Error(`Unreachable: router is not Object or router[${method}] is not Function`)
            }
          }
        } else {
          const router = this.router as unknown
          if (hasRoutingMethod(router, actionDescriptor.method)) {
            router[actionDescriptor.method](urlPathWithExt, ...params)
          } else {
            throw new Error(`Unreachable: router is not Object or router[${actionDescriptor.method}] is not Function`)
          }
        }
      }
    }
  }
}
