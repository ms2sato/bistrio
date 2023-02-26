import React from 'react'
import path from 'path'
import { Application } from 'express'

import { StaticRouter } from 'react-router-dom/server'

import {
  ActionContextCreator,
  buildActionContextCreator,
  ConstructViewFunc,
  initBistrioReactView,
  Middlewares,
  Router,
  RouterSupport,
  ServerRouterConfig,
} from 'bistrio'
import { ServerRouter, useWebpackDev, getRouterFactory, NormalRouterSupport } from 'bistrio'

import { N2R } from '@bistrio/routes/all'
import { Layout } from '../../isomorphic/views/_layout'

import webpackConfig from '../../config/client/webpack.config'

const { Wrapper } = initBistrioReactView<N2R>()

export const constructView: ConstructViewFunc = (Page, hydrate, options, ctx) => {
  // This is sample impl, changing js for any roles
  const script = ctx.query['admin'] == 'true' ? 'admin' : 'main'

  const props = { hydrate, script }
  return (
    <Wrapper ctx={ctx}>
      <Layout props={props}>
        <StaticRouter location={ctx.req.url}>
          <Page></Page>
        </StaticRouter>
      </Layout>
    </Wrapper>
  )
}

export type ExpressRouterConfig<M extends Middlewares> = {
  app: Application
  baseDir: string
  middlewares: M
  constructView: ConstructViewFunc
  routes: (router: Router, support: RouterSupport<M>) => void
  serverRouterConfig?: Partial<ServerRouterConfig>
}

export const useExpressRouter = async <M extends Middlewares>({
  app,
  baseDir,
  middlewares,
  constructView,
  routes,
  serverRouterConfig = {},
}: ExpressRouterConfig<M>) => {
  let viewRoot
  if (process.env.NODE_ENV == 'development') {
    // TODO: customizable
    viewRoot = path.join(baseDir, '../dist/isomorphic/views')
    useWebpackDev(app, webpackConfig)
  } else {
    // TODO: customizable
    viewRoot = path.join(baseDir, '../isomorphic/views')
  }

  const createActionContext: ActionContextCreator = buildActionContextCreator(viewRoot, constructView, '')
  const serverConfig: Partial<ServerRouterConfig> = { createActionContext, ...serverRouterConfig }

  const router: ServerRouter = getRouterFactory(serverConfig).getServerRouter(baseDir)
  const routerSupport = new NormalRouterSupport<M>(middlewares)
  routes(router, routerSupport)
  app.use(router.router)
  await router.build()
}
