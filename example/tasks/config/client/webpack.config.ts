import path from 'path'
import webpack from 'webpack'
import { entries } from '../../isomorphic/routes/_entries'
import { generateWebpackCoonfig } from 'bistrio'

const baseDir = path.join(__dirname, '../..')
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

const webpackConfig = generateWebpackCoonfig(generateWebpackCoonfigParams)
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
