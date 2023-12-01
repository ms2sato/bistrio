import { generateServerWebpackConfig } from 'bistrio'
import { config } from '../../config/index'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)

const webpackConfig = generateServerWebpackConfig({ config, bundlerConfigPath: __filename })

export default webpackConfig
