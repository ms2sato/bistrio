import path from 'path'
import {
  ActionSupport,
  Actions,
  Adapter,
  HandlerBuildRunner,
  Resource,
  ResourceMethodHandlerParams,
  ResourceSupport,
  RouteConfig,
  Router,
  RouterCoreLight,
  RouterOptions,
  ServerRouterConfig,
  ServerRouterConfigCustom,
  createDefaultActionContext,
  createNullActionOption,
  createSmartInputArranger,
  importAndSetup,
  renderDefault,
} from '..'
import { SmartResponder, StandardJsonResponder } from './smart-responder'

const createSmartResponder = ({ router }: ResourceMethodHandlerParams) => {
  return new SmartResponder(
    router,
    () => {
      throw new Error('Unimplemented Fatal Handler')
    },
    new StandardJsonResponder(),
  )
}

function defaultServerRouterConfig(): Omit<ServerRouterConfig, 'baseDir' | 'pageLoadFunc'> {
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

export abstract class BasicRouter implements Router {
  readonly serverRouterConfig: ServerRouterConfig

  constructor(
    serverRouterConfig: ServerRouterConfigCustom,
    readonly httpPath: string = '/',
    protected readonly routerCore: RouterCoreLight,
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

  // protected for test
  protected async loadAdapter(adapterPath: string, routeConfig: RouteConfig) {
    const fileRoot = this.serverRouterConfig.baseDir
    return await importAndSetup<ActionSupport, Adapter>(fileRoot, adapterPath, new ActionSupport(fileRoot), routeConfig)
  }
}
