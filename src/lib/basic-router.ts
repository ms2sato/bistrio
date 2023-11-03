import path from 'path'
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
} from '..'
import { ServerRouterConfig } from './server-router-config'
import { importAndSetup } from './server-router-impl'

export abstract class BasicRouter implements Router {
  constructor(
    readonly serverRouterConfig: ServerRouterConfig,
    readonly httpPath: string = '/',
    protected readonly routerCore: RouterCoreLight,
  ) {}

  abstract sub(...args: unknown[]): Router
  abstract layout(props: RouterLayoutType): Router
  abstract options(value: RouterOptions): Router

  protected abstract createResourcesHandlerBuildRunner(
    rpath: string,
    routeConfig: ResourceRouteConfig,
    pages: boolean,
  ): HandlerBuildRunner

  protected abstract createPagesHandlerBuildRunner(rpath: string, children: string[]): HandlerBuildRunner

  resources(rpath: string, config: ResourceRouteConfig, pages = false): void {
    this.routerCore.handlerBuildRunners.push(this.createResourcesHandlerBuildRunner(rpath, config, pages))
  }

  pages(rpath: string, children: string[]): void {
    this.routerCore.handlerBuildRunners.push(this.createPagesHandlerBuildRunner(rpath, children))
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

  // protected for test
  protected async loadResource(resourcePath: string, routeConfig: ResourceRouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    return await importAndSetup<ResourceSupport, Resource>(
      fileRoot,
      resourcePath,
      new ResourceSupport(fileRoot),
      routeConfig,
    )
  }

  // protected for test
  protected async loadAdapter(adapterPath: string, routeConfig: ResourceRouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    return await importAndSetup<ActionSupport, Adapter>(fileRoot, adapterPath, new ActionSupport(fileRoot), routeConfig)
  }
}
