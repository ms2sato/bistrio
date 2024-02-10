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
import { HMROptions, useHMR } from './webpack-hmr.js'

export type ExpressRouterConfig<M extends Middlewares> = {
  app: Application
  middlewares: M
  constructView: ConstructViewFunc
  routes: (router: Router, support: RouterSupport<M>) => void
  serverRouterConfig: ServerRouterConfig
  hmrOptions: HMROptions
}

export const useExpressRouter = async <M extends Middlewares>({
  app,
  middlewares,
  constructView,
  routes,
  serverRouterConfig,
  hmrOptions,
}: ExpressRouterConfig<M>) => {
  if (process.env.NODE_ENV === 'development') {
    useHMR(app, hmrOptions)
  }

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
