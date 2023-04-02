import path from 'path'
import { writeFile, chmod } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import webpack from 'webpack'
import { entries } from '../../isomorphic/config'
import { generateWebpackCoonfig } from 'bistrio'

const publicJsPath = '/js/'

const baseDir = path.join(__dirname, '../..')
const staticDir = path.resolve(baseDir, 'dist', 'public')

let generateWebpackCoonfigParams
if (process.env.NODE_ENV !== 'development') {
  generateWebpackCoonfigParams = {
    entries,
    baseDir,
    generateEntry: () => {
      const entry = Object.keys(entries).reduce<webpack.EntryObject>((obj, name) => {
        obj[name] = `./.bistrio/routes/${name}/_entry.ts`
        return obj
      }, {})
      return entry
    },
  }
} else {
  generateWebpackCoonfigParams = {
    entries,
    baseDir,
  }
}

const pluginName = 'URLMapPlugin'
class URLMapPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.emit.tapAsync(pluginName, async (compilation, callback) => {
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
        const filename = path.resolve(baseDir, '.bistrio', 'versions.json')
        await writeFile(filename, JSON.stringify(data, null, 2), { flag: 'w' })
        await chmod(filename, 0o666)

        callback()
      } catch (err) {
        callback(err as Error)
      }
    })
  }
}

const webpackConfig = generateWebpackCoonfig(generateWebpackCoonfigParams)
if (process.env.NODE_ENV === 'development') {
  webpackConfig.output = {
    ...webpackConfig.output,
    publicPath: publicJsPath,
  }
} else {
  const publicJsFullPath = path.join(staticDir, publicJsPath)
  if (!existsSync(publicJsFullPath)) {
    mkdirSync(publicJsFullPath, { recursive: true })
  }
  webpackConfig.output = {
    ...webpackConfig.output,
    path: publicJsFullPath,
    filename: '[name].[contenthash].bundle.js',
  }
}
webpackConfig.plugins = [new URLMapPlugin()]
webpackConfig.optimization = {
  splitChunks: {
    chunks: 'initial',
    cacheGroups: {
      default: {
        name: 'vendors',
        reuseExistingChunk: true,
      },
    },
  },
}

export default webpackConfig
