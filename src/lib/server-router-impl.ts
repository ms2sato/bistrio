import express, { NextFunction, RequestHandler } from 'express'
import { join } from 'node:path'
import { ZodError, AnyZodObject } from 'zod'
import debug from 'debug'
import {
  ActionContext,
  ActionDescriptor,
  ConstructDescriptor,
  Handler,
  Adapter,
  ResourceRouteConfig,
  RouterError,
  RequestCallback,
  SchemaUtil,
  Responder,
  HandlerBuildRunner,
  Resource,
  ResourceMethod,
  MutableActionContext,
  NamedResources,
  choiceSchema,
  choiseSources,
  blankSchema,
  FileNotFoundError,
  toErrorString,
  RouterCore,
  RouterLayoutType,
  ServerRouterConfig,
  ServerRouter,
  ResourceMethodHandlerParams,
  pageActionDescriptor,
  ClientConfig,
  Router,
  ActionType,
} from '../index.js'
import { HttpMethod, RouterOptions, opt } from './shared/index.js'
import { RouteObject } from 'react-router-dom'
import { RouteObjectPickupper } from './shared/route-object-pickupper.js'
import { BasicRouter } from './basic-router.js'

const log = debug('restrant2')
const routeLog = log.extend('route')
const handlerLog = log.extend('handler')

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

  const handleFatal = async (ctx: ActionContext, err: Error, option: unknown, _next: NextFunction) => {
    if (responder && 'fatal' in responder) {
      try {
        handlerLog('%s#%s.fatal', adapterPath, actionName)
        await responder.fatal?.apply(adapter, [ctx, err, option])
      } catch (er) {
        console.error('Unexpected Error on responder.fatal, dispatch to default responder', er)
        await defaultResponder.fatal(ctx, err)
      }
    } else {
      await defaultResponder.fatal(ctx, err)
    }
  }

  return (req, res, next) => {
    ;(async () => {
      const ctx = serverRouterConfig.createActionContext({ router, req, res, descriptor: actionDescriptor, httpPath })
      if (responder && 'override' in responder && responder.override) {
        const output = await responder.override.call(responder, ctx)
        await respond(ctx, output, undefined)
        return
      }

      const option = await serverRouterConfig.createActionOptions(ctx)

      const wrappedOption = new opt(option)
      if (schema == blankSchema) {
        // TODO: typesafe
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

            let input = schema.parse(source)
            if (responder && 'afterValidation' in responder) {
              input = (await responder.afterValidation?.(ctx, input, schema)) as { [x: string]: unknown }
            }

            handlerLog('input', input)

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const output = await resourceMethod.apply(resource, input ? [input, wrappedOption] : [wrappedOption])
            await respond(ctx, output, option)
          } catch (err) {
            if (err instanceof ZodError) {
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
    })().catch((err) => next(err))
  }
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
    return join(this.httpPath, filePath)
  }
  get routePath() {
    return join(this.httpPath, this.descriptor.path)
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

  getCore(): RouterCore {
    return this.router.routerCore
  }
}

export type ResourceProxyCreateFunc = (ctx: ActionContext) => Resource
class ResourceMethodCallingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResourceMethodCallingError'
  }
}

const createLocalResourceProxy = (
  serverRouterConfig: ServerRouterConfig,
  config: ResourceRouteConfig,
  resource: Resource,
): ResourceProxyCreateFunc => {
  return (ctx) => {
    const resourceProxy: Resource = {}
    for (const actionName in resource) {
      const resourceMethod = resource[actionName]
      const cad: ConstructDescriptor | undefined = config.construct?.[actionName]
      const actionDescriptor = config.actions?.find((action) => action.action === actionName)
      if (!actionDescriptor) {
        continue
      }

      const schema = choiceSchema(serverRouterConfig.constructConfig, cad, actionName)
      resourceProxy[actionName] = async function (...args) {
        try {
          const option = await serverRouterConfig.createActionOptions(ctx)
          const wrappedOption = new opt(option)

          if (args.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await resourceMethod.apply(resource, [wrappedOption])
          } else {
            schema.parse(args[0]) // if throw error, args[0] is unexpected

            // TOOD: typesafe
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
            return await resourceMethod.apply(resource, [...args, wrappedOption])
          }
        } catch (err) {
          console.error(err)
          throw new ResourceMethodCallingError(
            `ResourceMethod Calling Failed: ${config.name}#${actionName}; ${toErrorString(err)}`,
          )
        }
      }
    }

    return resourceProxy
  }
}

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

export class ServerRouterImpl extends BasicRouter implements ServerRouter {
  readonly router: express.Router
  private routeObjectPickupper: RouteObjectPickupper

  constructor(
    serverRouterConfig: ServerRouterConfig,
    protected readonly clientConfig: ClientConfig, // protected for test
    httpPath = '/',
    routeObject: RouteObject = {},
    readonly routerCore: RouterCore = {
      handlerBuildRunners: [],
      nameToResource: new Map(),
      nameToPath: new Map(),
      routeObject,
    },
    protected routerOptions: RouterOptions = { hydrate: false }, // protected for test
  ) {
    super(serverRouterConfig, httpPath, routerCore)
    this.router = express.Router({ mergeParams: true })
    this.routeObjectPickupper = new RouteObjectPickupper(clientConfig, routeObject, this.serverRouterConfig.loadPage)
  }

  sub(rpath: string, ...handlers: RequestHandler[]): Router {
    const subRouteObject = this.routeObjectPickupper.addNewSub(rpath)

    console.log('rpath', rpath)
    const subRouter = this.buildSubRouter(rpath, subRouteObject)

    this.router.use(this.normalizeRoutePath(rpath), ...[...handlers, subRouter.router])
    return subRouter as unknown as Router // TODO: fix type
  }

  // protected for test
  protected buildSubRouter(rpath: string, subRouteObject: RouteObject): ServerRouter {
    // TODO: impl class SubServerRouter without build
    console.log('buildSubRouter', rpath, join(this.routePath, rpath))

    return new ServerRouterImpl(
      this.serverRouterConfig,
      this.clientConfig,
      join(this.routePath, rpath),
      subRouteObject,
      this.routerCore,
      {
        ...this.routerOptions,
      },
    )
  }

  layout(props: RouterLayoutType) {
    const layoutRouteObject: RouteObject | undefined = this.routeObjectPickupper.addNewLayout(props)

    if (layoutRouteObject) {
      const subRouter = new ServerRouterImpl(
        this.serverRouterConfig,
        this.clientConfig,
        this.routePath,
        layoutRouteObject,
        this.routerCore,
        {
          ...this.routerOptions,
        },
      )

      this.router.use(subRouter.router)

      return subRouter
    }

    return this
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

  protected createResourcesHandlerBuildRunner(rpath: string, routeConfig: ResourceRouteConfig): HandlerBuildRunner {
    const isPageOnly = routeConfig.actions?.every((action) => action.page) && true

    const hasPages = routeConfig.actions?.some((ad) => ad.page) ?? false
    const subRouteObject = hasPages ? this.routeObjectPickupper.addNewSub(rpath) : undefined
    const pageActionDescriptors: ActionDescriptor[] = []
    const fullResourceRoutePath = this.getRoutePath(rpath)
    console.log('fullResourceRoutePath', fullResourceRoutePath)

    const pickPageToSubRouteObject = () => {
      if (subRouteObject) {
        this.routeObjectPickupper.pushPageRouteObjectsToSub(
          fullResourceRoutePath,
          subRouteObject,
          pageActionDescriptors,
        )
      }
    }

    return async () => {
      handlerLog('buildHandler: %s', join(this.routePath, rpath))
      const actionDescriptors: readonly ActionDescriptor[] = routeConfig.actions || this.serverRouterConfig.actions

      const resourceLocalPath = this.getResourceLocalPath(rpath)
      const resourceName = routeConfig.name
      if (this.routerCore.nameToResource.get(resourceName)) {
        throw new Error(
          `Duplicated Resource Name: ${resourceName}; path: ${resourceLocalPath}, with: ${
            this.routerCore.nameToPath.get(resourceName) ?? 'unknown'
          }`,
        )
      }

      let resource
      try {
        resource = await this.loadLocalResource(resourceLocalPath, routeConfig)
      } catch (err) {
        if (!(err instanceof FileNotFoundError) || !isPageOnly) {
          throw err
        }
      }

      if (resource) {
        this.routerCore.nameToResource.set(
          resourceName,
          createLocalResourceProxy(this.serverRouterConfig, routeConfig, resource),
        )
      }

      this.routerCore.nameToPath.set(resourceName, resourceLocalPath)

      const adapterLocalPath = this.getAdapterLocalPath(rpath)
      let adapter: Adapter

      try {
        adapter = await this.loadLocalAdapter(adapterLocalPath, routeConfig)
      } catch (err) {
        if (err instanceof FileNotFoundError) {
          adapter = {}
        } else {
          throw err
        }
      }

      for (const actionDescriptor of actionDescriptors) {
        if (actionDescriptor.page && actionDescriptor.hydrate === undefined) {
          actionDescriptor.hydrate = this.routerOptions.hydrate
        }

        const urlPath = join(rpath, actionDescriptor.path)
        const httpMethod = actionDescriptor.method
        const actionName = actionDescriptor.action

        const resourceMethod: ResourceMethod | undefined = resource?.[actionName]
        const actionFunc: Handler | Responder | RequestCallback | undefined = adapter[actionName]
        const constructDescriptor: ConstructDescriptor | undefined = routeConfig.construct?.[actionName]

        const actionOverride = actionFunc instanceof Function
        if (!actionOverride) {
          if (resourceMethod === undefined && !actionDescriptor.page) {
            throw new RouterError(
              `Logic not found! define action.page option on routes, or define ${resourceLocalPath}#${actionName} or/and ${adapterLocalPath}#${actionName}`,
            )
          }
        }

        if (actionOverride && resourceMethod !== undefined) {
          routeLog.extend('warn')(
            `${resourceLocalPath}#${actionName} is defined but will not be called auto. Responder support auto call; proposal: 'Remove ${resourceLocalPath}#${actionName}' or 'Change to Responder(not Function) ${adapterLocalPath}/#${actionName}' or 'Remove ${adapterLocalPath}/#${actionName}'`,
          )
        }

        const schema: AnyZodObject | undefined =
          resourceMethod === undefined
            ? undefined
            : choiceSchema(this.serverRouterConfig.constructConfig, constructDescriptor, actionName)

        let handlers
        if (actionOverride) {
          handlerLog('%s#%s without construct middleware', adapterLocalPath, actionName)
          const handler: express.Handler = (req, res, next) => {
            const ctx = this.serverRouterConfig.createActionContext({
              router: this,
              req,
              res,
              descriptor: actionDescriptor,
              httpPath: fullResourceRoutePath,
            })
            try {
              handlerLog('%s#%s as Handler', adapterLocalPath, actionName)
              const ret = actionFunc(ctx)
              if (isThenable(ret)) {
                ret.catch(next)
              }
            } catch (err) {
              next(err)
            }
          }

          handlers = [handler]
        } else {
          if (!resourceMethod) {
            if (!actionDescriptor.page) {
              throw new Error('Unreachable: resourceMethod is undefined and action.page not set')
            }

            const handler: express.Handler = this.createPageHandler(
              actionDescriptor,
              fullResourceRoutePath,
              pageActionDescriptors,
            )
            handlers = [handler]
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
              adapterLocalPath,
              actionName,
              schema.constructor.name,
              sources,
            )

            const handler: express.Handler = createResourceMethodHandler({
              resourceMethod,
              resource,
              sources,
              router: this,
              httpPath: fullResourceRoutePath,
              schema,
              adapterPath: adapterLocalPath,
              actionDescriptor,
              responder: actionFunc,
              adapter,
            })
            handlers = [handler]
          }
        }

        routeLog(
          '%s %s\t%s\t{actionOverride:%s, resourceMethod:%s, page: %s, hydrate: %s}',
          httpMethod instanceof Array ? httpMethod.join(',') : httpMethod,
          join(this.routePath, urlPath),
          actionName,
          actionOverride,
          !!resourceMethod,
          actionDescriptor.page,
          actionDescriptor.hydrate,
        )

        this.appendRoute(urlPath, actionDescriptor, handlers)
      }

      pickPageToSubRouteObject()
    }
  }

  protected createPagesHandlerBuildRunner(rpath: string, children: string[]): HandlerBuildRunner {
    const subRouteObject = this.routeObjectPickupper.addNewSub(rpath)
    const pageActionDescriptors: ActionDescriptor[] = []
    const fullResourceRoutePath = this.getRoutePath(rpath)

    const pickPageToSubRouteObject = () => {
      if (subRouteObject) {
        this.routeObjectPickupper.pushPageRouteObjectsToSub(
          fullResourceRoutePath,
          subRouteObject,
          pageActionDescriptors,
        )
      }
    }

    return () => {
      this.buildPagesHandler(rpath, children, pageActionDescriptors, fullResourceRoutePath)
      pickPageToSubRouteObject()
    }
  }

  private buildPagesHandler(
    rpath: string,
    children: string[],
    pageActionDescriptors: ActionDescriptor[],
    fullResourceRoutePath: string,
  ) {
    const router = this.router as unknown

    for (const child of children) {
      const childRoutePath = join(rpath, child)
      routeLog('%s', join(this.routePath, childRoutePath))

      if (!hasRoutingMethod(router, 'get')) {
        throw new Error(`Unreachable: router is not Object or router[get] is not Function`)
      }

      router.get(
        this.generateRoutePath(childRoutePath),
        this.createPageHandler(
          pageActionDescriptor(child, this.routerOptions.hydrate),
          fullResourceRoutePath,
          pageActionDescriptors,
        ),
      )
    }
  }

  private normalizeRoutePath(routePath: string) {
    routePath = routePath.startsWith('/') ? routePath : `/${routePath}`
    return this.serverRouterConfig.formatPlaceholderForRouter(routePath.replace(/\/$/, ''))
  }

  private generateRoutePath(routePath: string, type?: ActionType) {
    if (type) {
      return `${this.normalizeRoutePath(routePath)}.${type}`
    } else {
      return `${this.normalizeRoutePath(routePath)}.:format?`
    }
  }

  private appendRoute(routePath: string, { method, type }: ActionDescriptor, handlers: express.Handler[]) {
    console.log('appendRoute', routePath, method, type)
    const router = this.router as unknown

    const append = (method: HttpMethod, urlPathWithExt: string) => {
      if (hasRoutingMethod(router, method)) {
        console.log('append', router)
        router[method](urlPathWithExt, ...handlers)
      } else {
        throw new Error(`Unreachable: router is not Object or router[${method}] is not Function`)
      }
    }

    const urlPathWithExt = this.generateRoutePath(routePath, type)
    console.log('urlPathWithExt', urlPathWithExt)
    if (method instanceof Array) {
      for (const m of method) {
        append(m, urlPathWithExt)
      }
    } else {
      append(method, urlPathWithExt)
    }
  }

  private createPageHandler(
    actionDescriptor: ActionDescriptor,
    fullResourceRoutePath: string,
    pageActionDescriptors: ActionDescriptor[],
  ) {
    const handler: express.Handler = (req, res, next) => {
      const ctx = this.serverRouterConfig.createActionContext({
        router: this,
        req,
        res,
        descriptor: actionDescriptor,
        httpPath: fullResourceRoutePath,
      })
      try {
        handlerLog('page: %s', ctx.httpFilePath)
        this.serverRouterConfig.renderDefault(ctx)
      } catch (err) {
        next(err)
      }
    }

    pageActionDescriptors.push(actionDescriptor)
    return handler
  }
}
