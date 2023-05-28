import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { writeFile, chmod } from 'fs/promises'
import createDebug from 'debug'
import webpack, { Configuration } from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'

import { Config, ConfigCustom, fillConfig, config } from '../'

const debug = createDebug('bistrio:webpack')

export type Filemap = {
  js: { [key: string]: string }
}

export type GenereteEntryFunc = (params: { config: Config }) => Configuration['entry']

export type GenerateWebpackConfigParams = {
  config: ConfigCustom
  generateEntry?: GenereteEntryFunc
}

const defaultGenerateEntry = ({ config }: { config: Config }): Configuration['entry'] => {
  return Object.keys(config.entries).reduce<Record<string, string>>((obj, name) => {
    obj[name] = path.resolve(config.structure.generatedDir, `routes/${name}/_entry.ts`)
    return obj
  }, {})
}

const pluginName = 'URLMapPlugin'
class URLMapPlugin {
  constructor(private filemapPath: string) {}

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

        const data: Filemap = { js: jsMap }
        const filename = this.filemapPath
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
  const publicJsDir = path.resolve(structureConfig.publicDir, config.client.jsRoot)

  if (!existsSync(publicJsDir)) {
    mkdirSync(publicJsDir, { recursive: true })
  }

  const sharedBundlePrefix = config.client.sharedBundlePrefix

  const webpackConfig: Configuration = {
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
    plugins: [new URLMapPlugin(path.resolve(structureConfig.generatedDir, 'filemap.json'))],
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
            test: /[\\/]node_modules[\\/](bistrio)[\\/]/,
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

export type ScriptProps = GenerateScriptsProps & {
  hydrate: boolean
}

export type GenerateScriptsProps = {
  script: string | string[]
  filemap: Filemap
}

export const generateScripts = (props: ScriptProps): string[] => {
  const clientConfig = config().client
  const sharedPrefix = clientConfig.sharedBundlePrefix
  const sharedScriptEntries = Object.entries(props.filemap.js).filter(([key, _value]) => key.startsWith(sharedPrefix))

  const jsRoot = clientConfig.jsRoot
  const sharedScripts = sharedScriptEntries.map((entries) => path.join(jsRoot, entries[1]))

  const scripts = Array.isArray(props.script)
    ? props.script.map((js) => path.join(jsRoot, props.filemap.js[js]))
    : [path.join(jsRoot, props.filemap.js[props.script])]

  return [...sharedScripts, ...scripts]
}
