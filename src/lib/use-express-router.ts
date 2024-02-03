import { Application } from 'express'
import {
  config,
  ConstructViewFunc,
  Middlewares,
  NormalRouterSupport,
  Router,
  RouterSupport,
  ServerRouterConfig,
} from '../index.js'
import { ActionContextCreator } from './common.js'
import { ServerRouterImpl } from './server-router-impl.js'
import { ExpressActionContext } from './express-action-context.js'

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
  const conf = config()
  const createActionContext: ActionContextCreator = (params) => {
    return new ExpressActionContext({ ...params, constructView })
  }
  const serverConfig: ServerRouterConfig = { ...serverRouterConfig, createActionContext }

  const router: ServerRouterImpl = new ServerRouterImpl(serverConfig, conf.client)
  const routerSupport = new NormalRouterSupport<M>(middlewares)
  routes(router, routerSupport)
  app.use(router.router)
  await router.build()
  return router
}
