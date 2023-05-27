import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { writeFile, chmod } from 'fs/promises'
import createDebug from 'debug'
import webpack, { Configuration } from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'

import { ConfigCustom, fillConfig } from '../'

const debug = createDebug('bistrio:webpack')

export type GenereteEntryFunc = (params: GenerateWebpackConfigParams) => Configuration['entry']

export type GenerateWebpackConfigParams = {
  config: ConfigCustom
  generateEntry?: GenereteEntryFunc
  sharedBundlePrefix?: string
}

const defaultGenerateEntry = ({ config }: GenerateWebpackConfigParams): Configuration['entry'] => {
  return Object.keys(config.entries).reduce<Record<string, string>>((obj, name) => {
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
  config: custom,
  generateEntry = defaultGenerateEntry,
  sharedBundlePrefix = 'shared--',
}: GenerateWebpackConfigParams) => {
  debug('NODE_ENV=%s', process.env.NODE_ENV)

  const config = fillConfig(custom)
  const prod = 'production'
  const dev = 'development'
  const env = process.env.NODE_ENV === dev ? dev : prod
  const structureConfig = config.structure

  const configFile = path.resolve(structureConfig.configDir, 'client', `tsconfig.client.${env}.json`)
  if (env === 'development') {
    debug('Webpack is running in development mode...')
    debug('tsconfig: %s', configFile)
  }

  const entry = generateEntry({ config })

  if (!existsSync(structureConfig.publicJsDir)) {
    mkdirSync(structureConfig.publicJsDir, { recursive: true })
  }

  const webpackConfig: Configuration = {
    entry,
    output: {
      path: structureConfig.publicJsDir,
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
    plugins: [new URLMapPlugin(path.resolve(structureConfig.generatedDir, 'versions.json'))],
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
    ...webpackConfig,
    devtool: 'inline-source-map',
    stats: 'normal',
  }

  const prodConfig: Configuration = {
    ...webpackConfig,
  }

  return env === dev ? devConfig : prodConfig
}
