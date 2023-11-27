import path from 'node:path'
import { RouterError } from './shared/index.js'
import {
  ActionSupport,
  Adapter,
  HandlerBuildRunner,
  Resource,
  ResourceSupport,
  ResourceRouteConfig,
  Router,
  RouterCoreLight,
  RouterLayoutType,
  RouterOptions,
  EndpointFunc,
} from '../index.js'
import { ServerRouterConfig } from './server-router-config.js'
import { RequestHandler } from 'express'

const setup = <S, R>(
  ret: { default: EndpointFunc<S, R> },
  moduleLocalPath: string,
  support: S,
  config: ResourceRouteConfig,
): R => {
  try {
    return ret.default(support, config)
  } catch (err) {
    if (err instanceof Error) {
      throw new RouterError(`Error occured "${err.message}" on calling default function in "${moduleLocalPath}"`, {
        cause: err,
      })
    } else {
      throw new TypeError(`Unexpected Error Object: ${err as string}`, { cause: err })
    }
  }
}

export abstract class BasicRouter implements Router {
  constructor(
    readonly serverRouterConfig: ServerRouterConfig,
    readonly routePath: string = '/',
    protected readonly routerCore: RouterCoreLight,
  ) {}

  abstract sub(rpath: string, ...handlers: RequestHandler[]): Router
  abstract layout(props: RouterLayoutType): Router
  abstract options(value: RouterOptions): Router

  protected abstract createResourcesHandlerBuildRunner(
    rpath: string,
    routeConfig: ResourceRouteConfig,
  ): HandlerBuildRunner

  protected abstract createPagesHandlerBuildRunner(rpath: string, children: string[]): HandlerBuildRunner

  resources(rpath: string, config: ResourceRouteConfig): void {
    this.routerCore.handlerBuildRunners.push(this.createResourcesHandlerBuildRunner(rpath, config))
  }

  pages(rpath: string, children: string[]): void {
    this.routerCore.handlerBuildRunners.push(this.createPagesHandlerBuildRunner(rpath, children))
  }

  async build() {
    for (const requestHandlerSources of this.routerCore.handlerBuildRunners) {
      await requestHandlerSources()
    }
  }

  protected getRoutePath(rpath: string) {
    return path.join(this.routePath, rpath)
  }

  protected getResourceLocalPath(rpath: string) {
    return path.join(
      this.serverRouterConfig.resourceRoot,
      this.getRoutePath(rpath),
      this.serverRouterConfig.resourceFileName,
    )
  }

  protected getAdapterLocalPath(rpath: string) {
    return path.join(
      this.serverRouterConfig.adapterRoot,
      this.getRoutePath(rpath),
      this.serverRouterConfig.adapterFileName,
    )
  }

  // protected for test
  protected async loadLocalResource(resourceLocalPath: string, routeConfig: ResourceRouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    const fullPath = path.join(fileRoot, resourceLocalPath)

    const ret = (await this.serverRouterConfig.importLocal(fullPath)) as {
      default: EndpointFunc<ResourceSupport, Resource>
    }

    return setup<ResourceSupport, Resource>(ret, resourceLocalPath, new ResourceSupport(fileRoot), routeConfig)
  }

  // protected for test
  protected async loadLocalAdapter(adapterLocalPath: string, routeConfig: ResourceRouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    const fullPath = path.join(fileRoot, adapterLocalPath)

    const ret = (await this.serverRouterConfig.importLocal(fullPath)) as {
      default: EndpointFunc<ResourceSupport, Adapter>
    }

    return setup<ResourceSupport, Adapter>(ret, adapterLocalPath, new ActionSupport(fileRoot), routeConfig)
  }
}
