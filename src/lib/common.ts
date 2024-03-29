import express from 'express'
import { ActionContext, MutableActionContext, RouterCore } from './action-context.js'
import { ActionDescriptor, NamedResources, RenderSupport, Router } from './shared/index.js'
import { ServerRouterConfig } from './server-router-config.js'

export type ConstructViewFunc = (props: {
  routes: JSX.Element
  hydrate: boolean
  options: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rs: RenderSupport<any>
  ctx: ActionContext
}) => Promise<JSX.Element> | JSX.Element

export interface ServerRouter extends Router {
  readonly routerCore: RouterCore
  readonly router: express.Router
  readonly serverRouterConfig: ServerRouterConfig
  namedResources(ctx: ActionContext): NamedResources
}

export type ActionContextProps = {
  router: ServerRouter
  req: express.Request
  res: express.Response
  ad: ActionDescriptor
  httpPath: string
}

export type ActionContextCreator = (props: ActionContextProps) => MutableActionContext

export type BuildActionContextCreator = (
  viewRoot: string,
  arrange: ConstructViewFunc,
  failText: string,
) => ActionContextCreator
