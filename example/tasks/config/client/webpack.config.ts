import { config } from '../../config'
import { generateWebpackConfig } from 'bistrio'

const webpackConfig = generateWebpackConfig({
  config,
})

export default webpackConfig
