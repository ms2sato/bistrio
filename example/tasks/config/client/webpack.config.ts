import path from 'path'
import { entriesConfig } from '../../isomorphic/config'
import { generateWebpackConfig } from 'bistrio'

const baseDir = path.resolve(__dirname, '../..')

const webpackConfig = generateWebpackConfig({
  entriesConfig,
  baseDir,
})

export default webpackConfig
