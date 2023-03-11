import path from 'path'
import createDebug from 'debug'
import type { Application } from 'express'
import webpack, { Configuration } from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'

import {
  EntriesConfig,
  ActionContextCreator,
  buildActionContextCreator,
  ConstructViewFunc,
  Middlewares,
  Router,
  RouterSupport,
  ServerRouterConfig,
  ServerRouter,
  getRouterFactory,
  NormalRouterSupport,
} from '../'

const debug = createDebug('bistrio:webpack')

export function useWebpackDev(app: Application, webpackConfig: Configuration) {
  if (process.env.NODE_ENV !== 'production') {
    const compiler = webpack(webpackConfig)

    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output?.publicPath,
      })
    )
  }
}

export type GenereteEntryFunc = (params: GenerateWebpackConfigParams)=> Configuration['entry']

export type GenerateWebpackConfigParams = {
  entries: EntriesConfig
  baseDir: string
  generateEntry?: GenereteEntryFunc
}

const defaultGenerateEntry = ({ entries }: GenerateWebpackConfigParams): Configuration['entry'] => {
  return Object.keys(entries).reduce<Record<string, string>>((obj, name) => {
    obj[name] = `./.bistrio/routes/${name}/_entry.ts`
    return obj
  }, {})
}

export const generateWebpackCoonfig = ({ entries, baseDir, generateEntry = defaultGenerateEntry }: GenerateWebpackConfigParams) => {
  debug('NODE_ENV=%s', process.env.NODE_ENV)

  const prod = 'production'
  const dev = 'development'
  const env = process.env.NODE_ENV === dev ? dev : prod

  const configFile = path.join(baseDir, 'config', 'client', `tsconfig.client.${env}.json`)
  if (env === 'development') {
    debug('Webpack is running in development mode...')
    debug('tsconfig: %s', configFile)
  }

  const entry = generateEntry({ entries, baseDir })

  const config: Configuration = {
    entry,
    mode: env,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: configFile,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      plugins: [new TsconfigPathsPlugin({ configFile, extensions: ['.tsx', '.ts', '.js'] })],
    },
  }

  const devConfig: Configuration = {
    ...config,
    devtool: 'inline-source-map',
    output: {
      filename: '[name].js',
      publicPath: '/',
    },
    stats: 'normal',
  }

  const prodConfig: Configuration = {
    ...config,
    output: {
      filename: '[name].js',
      path: path.resolve(baseDir, 'dist', 'public'),
    },
  }

  return env === dev ? devConfig : prodConfig
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
