import path from 'path'
import {
  ActionContextCreator,
  ConstructViewFunc,
  Middlewares,
  NormalRouterSupport,
  Router,
  RouterSupport,
  ServerRouter,
  ServerRouterConfigCustom,
  buildActionContextCreator,
} from '..'
import { Application } from 'express'

export type ExpressRouterConfig<M extends Middlewares> = {
  app: Application
  baseDir: string
  middlewares: M
  constructView: ConstructViewFunc
  routes: (router: Router, support: RouterSupport<M>) => void
  serverRouterConfig: ServerRouterConfigCustom
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
  const serverConfig: ServerRouterConfigCustom = { createActionContext, ...serverRouterConfig }

  const router: ServerRouter = new ServerRouter(serverConfig)
  const routerSupport = new NormalRouterSupport<M>(middlewares)
  routes(router, routerSupport)
  app.use(router.router)
  await router.build()
}
