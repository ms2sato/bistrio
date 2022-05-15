import type { Application } from 'express'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpackConfig from '../../webpack.config'

export function useWebpackDev(app: Application) {
  if (process.env.NODE_ENV !== 'production') {
    const compiler = webpack(webpackConfig)

    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output?.publicPath,
      })
    )
  }
}
