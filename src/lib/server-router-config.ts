import { ZodType } from 'zod'
import {
  InputArranger,
  CreateActionOptionFunction,
  Responder,
  Renderer,
  Adapter,
  RequestCallback,
} from './action-context.js'
import { ActionContextCreator } from './common.js'
import { ServerRouterImpl } from './server-router-impl.js'
import {
  ActionDescriptor,
  ConstructConfig,
  ConstructSource,
  LoadPageFunc,
  Resource,
  ResourceMethod,
} from './shared/index.js'
import { PartialWithRequired } from './shared/type-util.js'

export type ResourceMethodHandlerParams = {
  resourceMethod: ResourceMethod
  resource: Resource
  sources: readonly ConstructSource[]
  router: ServerRouterImpl
  httpPath: string
  schema: ZodType
  adapterPath: string
  actionDescriptor: ActionDescriptor
  responder: Responder | RequestCallback
  adapter: Adapter
}

export type FormatPlaceholderForServerRouterFunc = (routePath: string) => string

export type LoadFunc = (path: string) => Promise<unknown>

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
  loadPage: LoadPageFunc
  importLocal: LoadFunc
  formatPlaceholderForRouter: FormatPlaceholderForServerRouterFunc
}

export type ServerRouterConfigCustom = PartialWithRequired<ServerRouterConfig, 'baseDir' | 'loadPage'>
