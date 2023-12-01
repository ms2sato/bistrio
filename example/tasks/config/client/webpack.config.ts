import { generateClientWebpackConfig } from 'bistrio'
import { config } from '../../config'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)

const webpackConfig = generateClientWebpackConfig({
  config,
  bundlerConfigPath: __filename,
})

export default webpackConfig
