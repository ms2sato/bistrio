import { generateServerWebpackConfig } from 'bistrio'
import { config } from '../../config'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)

const webpackConfig = generateServerWebpackConfig({ config, bundlerConfigPath: __filename })
webpackConfig.cache = false
webpackConfig.output.chunkFilename = '[name].[contenthash].js'
// webpackConfig.output = {
//   ...webpackConfig.output!,
//   clean: true,
//   filename: '[name].js?t=[contenthash]',
// }

export default webpackConfig
