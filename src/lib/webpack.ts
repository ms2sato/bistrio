import path from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
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
              if (chunk.name === undefined) {
                throw new Error('Unexpected: chunk.name is undefined')
              }
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

const dev = 'development'
const prod = 'production'
type Mode = 'development' | 'production'

function isWebpackMode(webpackMode: string | undefined): webpackMode is Mode {
  return webpackMode !== undefined && [prod, dev].includes(webpackMode)
}

export const generateWebpackConfig = ({
  config: custom,
  generateEntry = defaultGenerateEntry,
}: GenerateWebpackConfigParams) => {
  debug('NODE_ENV=%s', process.env.NODE_ENV)
  debug('WEBPACK_MODE=%s', process.env.WEBPACK_MODE)

  const config = fillConfig(custom)

  let env: Mode
  const webpackMode = process.env.WEBPACK_MODE
  if (isWebpackMode(webpackMode)) {
    env = webpackMode
  } else {
    env = !process.env.NODE_ENV || process.env.NODE_ENV === dev ? dev : prod
  }

  debug('mode=%s', env)

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
    cache: true,
  }

  return env === dev ? devConfig : webpackConfig
}

export type ScriptProps = GenerateScriptsProps & {
  hydrate: boolean
}

export type GenerateScriptsProps = {
  script: string | string[]
  filemap?: Filemap
}

class FilemapLoader {
  private _filemap?: Filemap

  constructor(private filemapPath: string) {}

  load(): Filemap {
    if (process.env.NODE_ENV !== 'development' && this._filemap) {
      return this._filemap
    }
    const rawdata = readFileSync(this.filemapPath)
    this._filemap = JSON.parse(rawdata.toString()) as Filemap
    return this._filemap
  }
}

let filemapLoader: FilemapLoader

const getFilemapLoader = () => {
  if (!filemapLoader) {
    filemapLoader = new FilemapLoader(path.resolve(config().structure.generatedDir, 'filemap.json'))
  }
  return filemapLoader
}

export const generateScripts = (props: ScriptProps): string[] => {
  const filemap = props.filemap || getFilemapLoader().load()

  const joinJsPath = (filePath: string) => {
    return path.join('/', jsRoot, filePath)
  }

  const clientConfig = config().client
  const sharedPrefix = clientConfig.sharedBundlePrefix
  const sharedScriptEntries = Object.entries(filemap.js).filter(([key, _value]) => key.startsWith(sharedPrefix))

  const jsRoot = clientConfig.jsRoot
  const sharedScripts = sharedScriptEntries.map((entries) => joinJsPath(entries[1]))

  const scripts = Array.isArray(props.script)
    ? props.script.map((js) => joinJsPath(filemap.js[js]))
    : [joinJsPath(filemap.js[props.script])]

  return [...sharedScripts, ...scripts]
}
