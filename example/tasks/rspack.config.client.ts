import path from 'node:path'
import { existsSync, mkdirSync } from 'fs'
import { writeFile, chmod } from 'fs/promises'
import { fileURLToPath } from 'node:url'
import { Configuration } from '@rspack/cli'
import { Compiler } from '@rspack/core'
import { Config, ConfigCustom, StructureConfig, fillConfig } from 'bistrio'
import { config as custom } from './config/index.ts'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const con = fillConfig(custom)
const structureConfig = con.structure
export type Filemap = {
  js: { [key: string]: string }
}

export type GenereteEntryFunc = (params: { config: Config }) => Configuration['entry']

export type GenerateWebpackConfigParams = {
  config: ConfigCustom
  bundlerConfigPath: string
  generateEntry?: GenereteEntryFunc
}

// const defaultGenerateEntry = ({ config }: { config: Config }): Configuration['entry'] => {
//   return Object.keys(config.entries).reduce<Record<string, string>>((obj, name) => {
//     obj[name] = path.resolve(config.structure.generatedDir, `routes/${name}/_entry.ts`)
//     return obj
//   }, {})
// }

const getFilemapPath = (structureConfig: StructureConfig) => path.resolve(structureConfig.generatedDir, 'filemap.json')

const pluginName = 'URLMapPlugin'
class URLMapPlugin {
  constructor(private filemapPath: string) {}

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      try {
        const jsMap: Record<string, string> = {}

        compilation?.chunks?.forEach((chunk) => {
          chunk.files.forEach((file) => {
            console.log('Compiler:', file, chunk.names, chunk.name)
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
        const dir = path.dirname(filename)
        if (!existsSync(dir)) {
          mkdirSync(dir, 0o755)
        }
        writeFile(filename, JSON.stringify(data, null, 2), { flag: 'w' })
          .then(() => chmod(filename, 0o666))
          .then(() => callback())
          .catch((err: false | Error | null | undefined) => callback(err))
      } catch (err) {
        callback(err as Error)
      }
    })
  }
}

const sharedBundlePrefix = con.client.sharedBundlePrefix

const configuration: Configuration = {
  entry: [path.join(__dirname, `.bistrio/routes/main/_entry.ts`)],
  output: {
    path: path.resolve(__dirname, 'dist/public'),
    filename: '[name].[contenthash].bundle.js',
  },
  resolve: {
    tsConfigPath: path.join(__dirname, './config/client/tsconfig.client.development.json'),
    alias: {
      '@': path.join(__dirname),
      '@bistrio': path.join(__dirname, '.bistrio'),
      '@isomorphic': path.join(__dirname, 'isomorphic'),
      '@server': path.join(__dirname, 'server'),
    },
  },
  plugins: [new URLMapPlugin(getFilemapPath(structureConfig))],
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

export default configuration
