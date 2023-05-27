import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { writeFile, chmod } from 'fs/promises'
import createDebug from 'debug'
import type { Application } from 'express'
import webpack, { Configuration } from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'

import {
  EntriesConfig,
  ActionContextCreator,
  buildActionContextCreator,
  ConstructViewFunc,
  Middlewares,
  Router,
  RouterSupport,
  ServerRouter,
  NormalRouterSupport,
  ServerRouterConfigCustom,
} from '../'

const debug = createDebug('bistrio:webpack')

export type GenereteEntryFunc = (params: GenerateWebpackConfigParams) => Configuration['entry']

export type GenerateWebpackConfigParams = {
  entriesConfig: EntriesConfig
  baseDir: string
  buildDir?: string
  publicDir?: string
  publicJsDir?: string
  generateEntry?: GenereteEntryFunc,
  sharedBundlePrefix?: string
}

const defaultGenerateEntry = ({ entriesConfig }: GenerateWebpackConfigParams): Configuration['entry'] => {
  return Object.keys(entriesConfig).reduce<Record<string, string>>((obj, name) => {
    obj[name] = `./.bistrio/routes/${name}/_entry.ts`
    return obj
  }, {})
}

const pluginName = 'URLMapPlugin'
class URLMapPlugin {
  constructor(private versionFilePath: string) {}

  apply(compiler: webpack.Compiler) {
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      try {
        const jsMap: Record<string, string> = {}

        compilation.chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            if (file.endsWith('.js')) {
              jsMap[chunk.name] = file
            }
          })
        })

        const data = { files: { js: jsMap } }
        const filename = this.versionFilePath
        writeFile(filename, JSON.stringify(data, null, 2), { flag: 'w' })
          .then(() => {
            return chmod(filename, 0o666)
          })
          .then(() => {
            callback()
          })
          .catch((err: false | Error | null | undefined) => {
            callback(err)
          })
      } catch (err) {
        callback(err as Error)
      }
    })
  }
}

export const generateWebpackConfig = ({
  entriesConfig,
  baseDir,
  buildDir = path.resolve(baseDir, '.bistrio'),
  publicDir = path.resolve(baseDir, 'dist', 'public'),
  publicJsDir = path.join(publicDir, 'js'),
  generateEntry = defaultGenerateEntry,
  sharedBundlePrefix = '${sharedBundlePrefix}'
}: GenerateWebpackConfigParams) => {
  debug('NODE_ENV=%s', process.env.NODE_ENV)

  const prod = 'production'
  const dev = 'development'
  const env = process.env.NODE_ENV === dev ? dev : prod

  const configFile = path.join(baseDir, 'config', 'client', `tsconfig.client.${env}.json`)
  if (env === 'development') {
    debug('Webpack is running in development mode...')
    debug('tsconfig: %s', configFile)
  }

  const entry = generateEntry({ entriesConfig, baseDir })

  if (!existsSync(publicJsDir)) {
    mkdirSync(publicJsDir, { recursive: true })
  }

  const config: Configuration = {
    entry,
    output: {
      path: publicJsDir,
      filename: '[name].[contenthash].bundle.js',
    },
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
    plugins: [new URLMapPlugin(path.resolve(buildDir, 'versions.json'))],
    optimization: {
      splitChunks: {
        chunks: 'initial',
        maxSize: 150000,
        cacheGroups: {
          foundation: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|zod|@remix-run)[\\/]/,
            name: `${sharedBundlePrefix}vendors-foundation`,
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
          },
          platform: {
            test: /[\\/]node_modules[\\/](bistrio|restrant2)[\\/]/,
            name: `${sharedBundlePrefix}vendors-platform`,
            priority: 30,
            reuseExistingChunk: true,
            enforce: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: `${sharedBundlePrefix}vendors-misc`,
            priority: 20,
            reuseExistingChunk: true,
            enforce: true,
          },
          commons: {
            name: `${sharedBundlePrefix}commons`,
            priority: 10,
            reuseExistingChunk: true,
          },
          default: {
            name: `${sharedBundlePrefix}default`,
            priority: 1,
            reuseExistingChunk: true,
          },
        },
      },
    },
  }

  const devConfig: Configuration = {
    ...config,
    devtool: 'inline-source-map',
    stats: 'normal',
  }

  const prodConfig: Configuration = {
    ...config,
  }

  return env === dev ? devConfig : prodConfig
}

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
