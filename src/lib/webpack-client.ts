import { resolve, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import createDebug from 'debug'
import { Configuration } from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'

import { Config, ConfigCustom, initConfig, config, StructureConfig } from '../index.js'
import { GenerateProductionConfigFunc, generateWebpackConfig } from './webpack-base.js'
import { Filemap } from './filemap.js'
import { WebpackFilemapPlugin } from './webpack-filemap-plugin.js'

const debug = createDebug('bistrio:webpack')

export type GenereteEntryFunc = (params: { config: Config }) => Configuration['entry']

export type GenerateClientWebpackConfigParams = {
  config: ConfigCustom
  bundlerConfigPath: string
  generateEntry?: GenereteEntryFunc
}

const defaultGenerateEntry = ({ config }: { config: Config }): Configuration['entry'] => {
  return Object.keys(config.entries).reduce<Record<string, string>>((obj, name) => {
    obj[name] = resolve(config.structure.generatedDir, `routes/${name}/_entry.ts`)
    return obj
  }, {})
}

const getFilemapPath = (structureConfig: StructureConfig) => resolve(structureConfig.generatedDir, 'filemap.json')

const generateClientProductionConfig: GenerateProductionConfigFunc = ({ config, env, entry }) => {
  const structureConfig = config.structure
  const configFile = resolve(structureConfig.configDir, 'client', `tsconfig.${env}.json`)
  if (env === 'development') {
    debug('tsconfig: %s', configFile)
  }

  const publicJsDir = resolve(structureConfig.publicDir, config.client.jsRoot)

  if (!existsSync(publicJsDir)) {
    mkdirSync(publicJsDir, { recursive: true })
  }

  const sharedBundlePrefix = config.client.sharedBundlePrefix

  return {
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
              configFile,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['', '.tsx', '.ts', '.js'],
      plugins: [new TsconfigPathsPlugin({ configFile, extensions: ['.tsx', '.ts', '.js'] })],
    },
    plugins: [new WebpackFilemapPlugin(getFilemapPath(structureConfig))],
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
}

export const generateClientWebpackConfig = ({
  config: custom,
  bundlerConfigPath,
  generateEntry = defaultGenerateEntry,
}: GenerateClientWebpackConfigParams) => {
  const config = initConfig(custom)
  const entry = generateEntry({ config })
  const cacheName = 'webpack-client'
  return generateWebpackConfig({
    config,
    bundlerConfigPath,
    entry,
    cacheName,
    generateProductionConfig: generateClientProductionConfig,
  })
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
    filemapLoader = new FilemapLoader(getFilemapPath(config().structure))
  }
  return filemapLoader
}

export const generateScripts = (props: ScriptProps): string[] => {
  const filemap = props.filemap || getFilemapLoader().load()

  const joinJsPath = (filePath: string) => {
    return join('/', jsRoot, filePath)
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
