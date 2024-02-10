import { Application } from 'express'

import webpack, { Configuration } from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'

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
  hmr: { clientWebpackConfig: Configuration }
}

export const useExpressRouter = async <M extends Middlewares>({
  app,
  middlewares,
  constructView,
  routes,
  serverRouterConfig,
  hmr: { clientWebpackConfig },
}: ExpressRouterConfig<M>) => {
  if (process.env.NODE_ENV === 'development') {
    useHMR(app, clientWebpackConfig)
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

const useHMR = (app: Application, webpackConfig: Configuration) => {
  const entryObject = webpackConfig.entry as Record<string, string | string[]>
  Object.keys(entryObject).forEach(function (key) {
    entryObject[key] = ['webpack-hot-middleware/client', entryObject[key] as string]
  })
  webpackConfig.output = {
    ...webpackConfig.output,
    clean: true,
  }

  webpackConfig.optimization = {
    moduleIds: 'deterministic',
  }

  webpackConfig.plugins = [new webpack.HotModuleReplacementPlugin(), new ReactRefreshWebpackPlugin({ overlay: false })]

  const compiler = webpack(webpackConfig)

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    webpackDevMiddleware(compiler, {
      publicPath: webpackConfig.output.publicPath,
      serverSideRender: true,
    }),
  )
  app.use(webpackHotMiddleware(compiler))
}
