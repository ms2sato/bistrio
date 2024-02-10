import { Application } from 'express'
import webpack, { Configuration } from 'webpack'
import webpackDevMiddleware, { IncomingMessage, ServerResponse } from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'

// @see https://github.com/webpack-contrib/webpack-hot-middleware/issues/180#issuecomment-282960011
export const defaultHotMiddlewareClientPath = 'webpack-hot-middleware/client?reload=true'

export type HMROptions = {
  clientWebpackConfig: Configuration
  hotMiddlewareClientPath?: string
  devMiddlewareOptions?: webpackDevMiddleware.Options<IncomingMessage, ServerResponse>
  hotMiddlewareOptions?: webpackHotMiddleware.MiddlewareOptions
}

export const useHMR = (
  app: Application,
  {
    clientWebpackConfig,
    devMiddlewareOptions = {},
    hotMiddlewareOptions = {},
    hotMiddlewareClientPath = defaultHotMiddlewareClientPath,
  }: HMROptions,
) => {
  const entryObject = clientWebpackConfig.entry as Record<string, string | string[]>
  Object.keys(entryObject).forEach(function (key) {
    entryObject[key] = [hotMiddlewareClientPath, entryObject[key] as string]
  })
  clientWebpackConfig.output = {
    ...clientWebpackConfig.output,
    clean: true,
  }

  clientWebpackConfig.optimization = {
    moduleIds: 'deterministic',
  }

  clientWebpackConfig.plugins = [
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin({ overlay: false }),
  ]

  const compiler = webpack(clientWebpackConfig)

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    webpackDevMiddleware(compiler, {
      publicPath: clientWebpackConfig.output.publicPath,
      serverSideRender: true,
      ...devMiddlewareOptions,
    }),
  )
  app.use(webpackHotMiddleware(compiler, hotMiddlewareOptions))
}
