import express from 'express'
import { AnyZodObject } from 'zod'
import { RouteObject } from 'react-router-dom'
import {
  ValidationError,
  Resource,
  ActionDescriptor,
  ResourceRouteConfig,
  NamedResources,
  HandlerBuildRunner,
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

export type ActionContext = {
  render: express.Response['render']
  readonly redirect: express.Response['redirect']
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
  success?: (ctx: ActionContext, output: Out, option?: Opt) => unknown | Promise<unknown>
  invalid?: (ctx: ActionContext, err: ValidationError, source: Src, option?: Opt) => void | Promise<void>
  fatal?: (ctx: ActionContext, err: Error, option?: Opt) => void | Promise<void>
}

export type RequestCallback<In = unknown> = {
  beforeValidation?: (ctx: ActionContext, source: unknown, schema: AnyZodObject) => unknown
  afterValidation?: (ctx: ActionContext, input: In, schema: AnyZodObject) => unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override?: (ctx: ActionContext) => unknown
}

export type Adapter<Opt = unknown, In = unknown> = {
  [key: string]: Handler | Responder<Opt> | RequestCallback<In>
}

export type CreateActionOptionFunction = (ctx: ActionContext) => unknown | Promise<unknown>

/**
 * @returns If not rendered return false.
 */
export type Renderer = (ctx: ActionContext, options?: unknown) => false | undefined

export type InputArranger = (ctx: MutableActionContext, sources: readonly string[], schema: AnyZodObject) => unknown

export class ActionSupport {}

export class ResourceSupport {}

export type EndpointFunc<S, R> = (support: S, config: ResourceRouteConfig) => R
export type ResourceFunc = EndpointFunc<ResourceSupport, Resource>
export type ActionFunc = EndpointFunc<ActionSupport, Adapter>
