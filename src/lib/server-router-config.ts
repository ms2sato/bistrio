import {
  InputArranger,
  CreateActionOptionFunction,
  Responder,
  Renderer,
  Adapter,
  RequestCallback,
  z,
} from './action-context'
import { ActionContextCreator } from './common'
import { ServerRouterImpl } from './server-router-impl'
import { ActionDescriptor, ConstructConfig, ConstructSource, PageLoadFunc, Resource, ResourceMethod } from './shared'
import { PartialWithRequired } from './type-util'

export type ResourceMethodHandlerParams = {
  resourceMethod: ResourceMethod
  resource: Resource
  sources: readonly ConstructSource[]
  router: ServerRouterImpl
  httpPath: string
  schema: z.AnyZodObject
  adapterPath: string
  actionDescriptor: ActionDescriptor
  responder: Responder | RequestCallback
  adapter: Adapter
}

export type FormatPlaceholderForServerRouterFunc = (routePath: string) => string

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
  pageLoadFunc: PageLoadFunc
  formatPlaceholderForRouter: FormatPlaceholderForServerRouterFunc
}

export type ServerRouterConfigCustom = PartialWithRequired<ServerRouterConfig, 'baseDir' | 'pageLoadFunc'>
