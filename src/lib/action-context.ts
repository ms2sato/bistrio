import express from 'express'
import { ZodType } from 'zod'
import { RouteObject } from 'react-router-dom'
import {
  ValidationError,
  Resource,
  ActionDescriptor,
  ResourceRouteConfig,
  NamedResources,
  HandlerBuildRunner,
  ActionOption,
} from '../index.js'
import { ResourceProxyCreateFunc } from './server-router-impl.js'

export type RouterCoreLight = {
  handlerBuildRunners: HandlerBuildRunner[]
  nameToResource: Map<string, ResourceProxyCreateFunc>
  nameToPath: Map<string, string>
}

export type RouterCore = RouterCoreLight & {
  routeObject: RouteObject
}

export interface ActionContext {
  readonly params: express.Request['params']
  readonly body: express.Request['body']
  readonly query: express.Request['query']
  readonly format: string
  readonly input: unknown
  readonly req: express.Request
  readonly res: express.Response
  readonly httpPath: string // acccept resource path
  readonly httpFilePath: string // path for output file ex. /test/:id/items/index
  readonly routePath: string // path for routing ex. /test/:id/items
  readonly descriptor: ActionDescriptor
  readonly willRespondJson: () => boolean
  resources(): NamedResources
  respond(response: Response): Promise<void>
  renderRequestedView(): Promise<void> // render view from httpFilePath
  getCore(): RouterCore
}

export type MutableActionContext = ActionContext & {
  mergeInputs(
    sources: readonly string[],
    pred?: (input: Record<string, unknown>, source: string) => Record<string, unknown>,
  ): Record<string, unknown>
}

export type Handler = (ctx: ActionContext) => void | Promise<void>

export type Responder<Opt = unknown, Out = unknown, Src = unknown> = {
  success?: (
    ctx: ActionContext,
    output: Out,
    option?: Opt,
  ) => Response | false | undefined | Promise<Response | false | undefined>
  invalid?: (ctx: ActionContext, err: ValidationError, source: Src, option?: Opt) => Response | Promise<Response>
  fatal?: (ctx: ActionContext, err: Error, option?: Opt) => Response | Promise<Response>
}

export type FilledResponder<Opt = unknown, Out = unknown, Src = unknown> = Required<Responder<Opt, Out, Src>>

export type RequestCallback<In = unknown> = {
  beforeValidation?: (ctx: ActionContext, source: unknown, schema: ZodType) => IncommingType | Promise<IncommingType>
  afterValidation?: (ctx: ActionContext, input: In, schema: ZodType) => IncommingType | Promise<IncommingType>
  override?: (ctx: ActionContext) => Record<string, unknown> | undefined | Promise<Record<string, unknown> | void>
}

export type Adapter<Opt = unknown, In = unknown> = {
  [key: string]: Handler | Responder<Opt> | RequestCallback<In>
}

export type CreateActionOptionFunction = (ctx: ActionContext) => ActionOption | Promise<ActionOption>

/**
 * @returns If not rendered return false.
 */
export type Renderer = (ctx: ActionContext, options?: unknown) => Promise<false | undefined>

export type IncommingType = Record<string, unknown> | File

export type InputArrangerResult = [IncommingType, () => void | Promise<void>]

export type InputArranger = (
  ctx: MutableActionContext,
  sources: readonly string[],
  schema: ZodType,
) => InputArrangerResult | Promise<InputArrangerResult>

export class ActionSupport {}

export class ResourceSupport {}

export type EndpointFunc<S, R> = (support: S, config: ResourceRouteConfig) => R
export type ResourceFunc = EndpointFunc<ResourceSupport, Resource>
export type ActionFunc = EndpointFunc<ActionSupport, Adapter>
