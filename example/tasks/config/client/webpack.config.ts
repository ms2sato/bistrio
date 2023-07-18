import path from 'path'
import { config } from '../../config'
import { generateWebpackConfig } from 'bistrio'

const webpackConfig = generateWebpackConfig({
  config,
  bundlerConfigPath: __filename,
})

export default webpackConfig
