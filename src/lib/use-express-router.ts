import { Application } from 'express'
import { ConstructViewFunc, Middlewares, NormalRouterSupport, Router, RouterSupport, ServerRouterConfig, config } from '..'
import { ActionContextCreator } from './common'
import { ServerRouterImpl } from './server-router-impl'
import { buildActionContextCreator } from './build-action-context-creator'

export type ExpressRouterConfig<M extends Middlewares> = {
  app: Application
  middlewares: M
  constructView: ConstructViewFunc
  routes: (router: Router, support: RouterSupport<M>) => void
  serverRouterConfig: ServerRouterConfig
}

export const useExpressRouter = async <M extends Middlewares>({
  app,
  middlewares,
  constructView,
  routes,
  serverRouterConfig,
}: ExpressRouterConfig<M>) => {
  const createActionContext: ActionContextCreator = buildActionContextCreator(constructView)
  const serverConfig: ServerRouterConfig = { ...serverRouterConfig, createActionContext }

  const router: ServerRouterImpl = new ServerRouterImpl(serverConfig)
  const routerSupport = new NormalRouterSupport<M>(middlewares)
  routes(router, routerSupport)
  app.use(router.router)
  await router.build()
}
