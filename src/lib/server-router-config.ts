import { ZodType } from 'zod'
import {
  InputArranger,
  CreateActionOptionsFunction,
  Responder,
  Adapter,
  RequestCallback,
  FilledResponder,
} from './action-context.js'
import { ActionContextCreator } from './common.js'
import { ServerRouterImpl } from './server-router-impl.js'
import {
  ActionDescriptor,
  StrictInputsConfig,
  InputSource,
  LoadPageFunc,
  Resource,
  ResourceMethod,
} from './shared/index.js'
import { PartialWithRequired } from './shared/type-util.js'

export type ResourceMethodHandlerParams = {
  resourceMethod: ResourceMethod
  resource: Resource
  sources: readonly InputSource[]
  router: ServerRouterImpl
  httpPath: string
  schema: ZodType
  adapterPath: string
  ad: ActionDescriptor
  responder: Responder | RequestCallback
  adapter: Adapter
}

export type FormatPlaceholderForServerRouterFunc = (routePath: string) => string

export type LoadFunc = (path: string) => Promise<unknown>

export type CreateDefaultResponderFunc = (params: ResourceMethodHandlerParams) => FilledResponder

export type ServerRouterConfig = {
  baseDir: string
  actions: readonly ActionDescriptor[]
  inputArranger: InputArranger
  createActionOptions: CreateActionOptionsFunction
  createActionContext: ActionContextCreator
  inputsConfig: StrictInputsConfig
  createDefaultResponder: CreateDefaultResponderFunc
  adapterRoot: string
  adapterFileName: string
  resourceRoot: string
  resourceFileName: string
  loadPage: LoadPageFunc
  importLocal: LoadFunc
  formatPlaceholderForRouter: FormatPlaceholderForServerRouterFunc
}

export type ServerRouterConfigCustom = PartialWithRequired<ServerRouterConfig, 'baseDir' | 'loadPage'>
