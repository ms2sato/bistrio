import { generateWebpackConfig } from 'bistrio'
import { config } from '../../config'

const webpackConfig = generateWebpackConfig({
  config,
  bundlerConfigPath: __filename,
})

export default webpackConfig
