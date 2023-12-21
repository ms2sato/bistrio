import { generateServerWebpackConfig } from 'bistrio'
import { config } from '../../config'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)

const webpackConfig = generateServerWebpackConfig({ config, bundlerConfigPath: __filename })

webpackConfig.experiments = {
  outputModule: true,
}
webpackConfig.output!.module = true
webpackConfig.output!.filename = '[name].js'
webpackConfig.output!.library = { type: 'module' }

export default webpackConfig
