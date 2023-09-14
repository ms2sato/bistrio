import path from 'path'
import { Application } from 'express'
import { ConstructViewFunc, Middlewares, NormalRouterSupport, Router, RouterSupport, ServerRouterConfig } from '..'
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
  let viewRoot
  if (process.env.NODE_ENV == 'development') {
    // TODO: customizable
    viewRoot = path.join(serverRouterConfig.baseDir, '../dist/isomorphic/views')
  } else {
    // TODO: customizable
    viewRoot = path.join(serverRouterConfig.baseDir, '../isomorphic/views')
  }

  const createActionContext: ActionContextCreator = buildActionContextCreator(viewRoot, constructView, '')
  const serverConfig: ServerRouterConfig = { ...serverRouterConfig, createActionContext }

  const router: ServerRouterImpl = new ServerRouterImpl(serverConfig)
  const routerSupport = new NormalRouterSupport<M>(middlewares)
  routes(router, routerSupport)
  app.use(router.router)
  await router.build()
}
