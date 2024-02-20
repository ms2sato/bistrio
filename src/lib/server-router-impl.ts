import express, { NextFunction, RequestHandler } from 'express'
import { join } from 'node:path'
import { ZodType, ZodError } from 'zod'
import debug from 'debug'
import {
  ActionContext,
  ActionDescriptor,
  InputDescriptor,
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
  createPageActionDescriptor,
  ClientConfig,
  Router,
  ActionType,
  isActionOptions,
} from '../index.js'
import { HttpMethod, RouterOptions } from './shared/index.js'
import { RouteObject } from 'react-router-dom'
import { RouteObjectPickupper } from './shared/route-object-pickupper.js'
import { BasicRouter } from './basic-router.js'

const log = debug('restrant2')
const routeLog = log.extend('route')
const handlerLog = log.extend('handler')

const createResourceMethodHandler = (params: ResourceMethodHandlerParams): express.Handler => {
  const { resourceMethod, resource, sources, router, httpPath, schema, adapterPath, ad, responder, adapter } = params

  const serverRouterConfig = router.serverRouterConfig
  const defaultResponder = serverRouterConfig.createDefaultResponder(params)
  const actionName = ad.action

  const respond = async (ctx: ActionContext, output: unknown, option: unknown) => {
    let response: Response | undefined | false
    if (responder && 'success' in responder) {
      handlerLog('%s#%s.success', adapterPath, actionName)
      const ret = await responder.success?.apply(adapter, [ctx, output, option])
      if (ret === false) {
        handlerLog(' dispatch to default responder')
        response = await defaultResponder.success(ctx, output)
      } else if (ret !== undefined) {
        handlerLog(' dispatch to default responder for ret value')
        response = await defaultResponder.success(ctx, ret)
      }
    } else {
      handlerLog('%s#%s success by default responder', adapterPath, actionName)
      response = await defaultResponder.success(ctx, output)
    }

    if (response) {
      await ctx.respond(response)
    }

    if (response === false) {
      throw new Error('Cannot return false from defaultResponder.success')
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

  const resourceMethodHandler: express.Handler = (req, res, next) => {
    ;(async () => {
      const ctx = serverRouterConfig.createActionContext({ router, req, res, ad: ad, httpPath })
      if (responder && 'override' in responder && responder.override) {
        const output = await responder.override.call(responder, ctx)
        await respond(ctx, output, undefined)
        return
      }

      const options = await serverRouterConfig.createActionOptions(ctx)
      if (!isActionOptions(options)) {
        throw new Error('"options" is not an ActionOptions')
      }

      if (schema == blankSchema) {
        // TODO: typesafe
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const output = await resourceMethod.apply(resource, [options])
        await respond(ctx, output, options)
      } else {
        try {
          const arranged = await serverRouterConfig.inputArranger(ctx, sources, schema)
          let input = arranged[0]
          const cleanup = arranged[1]

          handlerLog('input: %o', input)

          try {
            if (responder && 'beforeValidation' in responder && responder.beforeValidation) {
              input = await responder.beforeValidation(ctx, input, schema)
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            let trusted = schema.parse(input)
            if (responder && 'afterValidation' in responder && responder.afterValidation) {
              trusted = await responder.afterValidation(ctx, trusted, schema)
            }

            handlerLog('trusted', trusted)

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const output = await resourceMethod.apply(resource, trusted ? [trusted, options] : [options])
            await respond(ctx, output, options)
          } catch (err) {
            if (err instanceof ZodError) {
              const validationError = err
              handlerLog.extend('debug')('%s#%s validationError %s', adapterPath, actionName, validationError.message)
              if (responder) {
                if ('invalid' in responder) {
                  if (!responder.invalid) {
                    throw new Error('Unreachable: invalid in responder is not implemented')
                  }

                  const filledSource = SchemaUtil.fillDefault(schema, input)
                  handlerLog('%s#%s.invalid', adapterPath, actionName, filledSource)
                  res.status(422)
                  await responder.invalid.apply(adapter, [ctx, validationError, filledSource, options])
                } else {
                  next(validationError)
                }
              } else {
                handlerLog('%s#%s invalid by default responder', adapterPath, actionName)
                await defaultResponder.invalid(ctx, validationError, input)
              }
            } else {
              await handleFatal(ctx, err as Error, options, next)
            }
          } finally {
            await cleanup()
          }
        } catch (err) {
          return await handleFatal(ctx, err as Error, options, next)
        }
      }
    })().catch((err) => next(err))
  }
  return resourceMethodHandler
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
      const cad: InputDescriptor | undefined = config.inputs?.[actionName]
      const ad = config.actions?.find((action) => action.action === actionName)
      if (!ad) {
        continue
      }

      const schema = choiceSchema(serverRouterConfig.inputsConfig, cad, actionName)
      resourceProxy[actionName] = async function (...args) {
        try {
          const options = await serverRouterConfig.createActionOptions(ctx)
          if (!isActionOptions(options)) {
            throw new Error('"options" is not an ActionOptions')
          }

          if (args.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await resourceMethod.apply(resource, [options])
          } else {
            schema.parse(args[0]) // if throw error, args[0] is unexpected

            // TOOD: typesafe
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
            return await resourceMethod.apply(resource, [...args, options])
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
  readonly routeObjectPickupper: RouteObjectPickupper

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

    const subRouter = this.buildSubRouter(rpath, subRouteObject)

    this.router.use(this.normalizeRoutePath(rpath), ...[...handlers, subRouter.router])
    return subRouter as unknown as Router // TODO: fix type
  }

  // protected for test
  protected buildSubRouter(rpath: string, subRouteObject: RouteObject): ServerRouter {
    // TODO: impl class SubServerRouter without build
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
    const pageAds: ActionDescriptor[] = []
    const httpPath = this.getRoutePath(rpath)

    const pickPageToSubRouteObject = () => {
      if (subRouteObject) {
        this.routeObjectPickupper.pushPageRouteObjectsToSub(httpPath, subRouteObject, pageAds)
      }
    }

    return async () => {
      handlerLog('buildHandler: %s', join(this.routePath, rpath))
      const ads: readonly ActionDescriptor[] = routeConfig.actions || this.serverRouterConfig.actions

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

      for (const ad of ads) {
        if (ad.page && ad.hydrate === undefined) {
          ad.hydrate = this.routerOptions.hydrate
        }

        const urlPath = join(rpath, ad.path)
        const httpMethod = ad.method
        const actionName = ad.action

        const resourceMethod: ResourceMethod | undefined = resource?.[actionName]
        const actionFunc: Handler | Responder | RequestCallback | undefined = adapter[actionName]
        const inputDescriptor: InputDescriptor | undefined = routeConfig.inputs?.[actionName]

        const actionOverride = actionFunc instanceof Function
        if (!actionOverride) {
          if (resourceMethod === undefined && !ad.page) {
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

        const schema: ZodType | undefined =
          resourceMethod === undefined
            ? undefined
            : choiceSchema(this.serverRouterConfig.inputsConfig, inputDescriptor, actionName)

        let handlers
        if (actionOverride) {
          handlerLog('%s#%s without construct middleware', adapterLocalPath, actionName)
          const handler: express.Handler = (req, res, next) => {
            const ctx = this.serverRouterConfig.createActionContext({
              router: this,
              req,
              res,
              ad: ad,
              httpPath: httpPath,
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
            if (!ad.page) {
              throw new Error('Unreachable: resourceMethod is undefined and action.page not set')
            }

            const handler: express.Handler = this.createPageHandler(ad, httpPath, pageAds)
            handlers = [handler]
          } else {
            if (!schema) {
              throw new Error('Unreachable: schema is undefined')
            }

            if (!resource) {
              throw new Error('Unreachable: resource is undefined')
            }

            const sources = choiseSources(this.serverRouterConfig.inputsConfig, inputDescriptor, actionName)
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
              httpPath: httpPath,
              schema,
              adapterPath: adapterLocalPath,
              ad,
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
          ad.page,
          ad.hydrate,
        )

        this.appendRoute(urlPath, ad, handlers)
      }

      pickPageToSubRouteObject()
    }
  }

  protected createPagesHandlerBuildRunner(rpath: string, children: string[]): HandlerBuildRunner {
    const subRouteObject = this.routeObjectPickupper.addNewSub(rpath)
    const pageAds: ActionDescriptor[] = []
    const httpPath = this.getRoutePath(rpath)

    const pickPageToSubRouteObject = () => {
      if (subRouteObject) {
        this.routeObjectPickupper.pushPageRouteObjectsToSub(httpPath, subRouteObject, pageAds)
      }
    }

    return () => {
      this.buildPagesHandler(rpath, children, pageAds, httpPath)
      pickPageToSubRouteObject()
    }
  }

  private buildPagesHandler(rpath: string, children: string[], pageAds: ActionDescriptor[], httpPath: string) {
    const router = this.router as unknown

    for (const child of children) {
      const childRoutePath = join(rpath, child)
      routeLog('%s', join(this.routePath, childRoutePath))

      if (!hasRoutingMethod(router, 'get')) {
        throw new Error(`Unreachable: router is not Object or router[get] is not Function`)
      }

      router.get(
        this.generateRoutePath(childRoutePath),
        this.createPageHandler(createPageActionDescriptor(child, this.routerOptions.hydrate), httpPath, pageAds),
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
    const router = this.router as unknown

    const append = (method: HttpMethod, urlPathWithExt: string) => {
      if (hasRoutingMethod(router, method)) {
        router[method](urlPathWithExt, ...handlers)
      } else {
        throw new Error(`Unreachable: router is not Object or router[${method}] is not Function`)
      }
    }

    const urlPathWithExt = this.generateRoutePath(routePath, type)
    if (method instanceof Array) {
      for (const m of method) {
        append(m, urlPathWithExt)
      }
    } else {
      append(method, urlPathWithExt)
    }
  }

  private createPageHandler(ad: ActionDescriptor, httpPath: string, pageAds: ActionDescriptor[]) {
    const pageHandler: express.Handler = (req, res, next) => {
      const ctx = this.serverRouterConfig.createActionContext({
        router: this,
        req,
        res,
        ad,
        httpPath,
      })

      ;(async () => {
        handlerLog('page: %s', ctx.httpFilePath)
        await ctx.renderRequestedView()
      })().catch((err) => next(err))
    }

    pageAds.push(ad)
    return pageHandler
  }
}
