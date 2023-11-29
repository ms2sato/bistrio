import path from 'node:path'
import createDebug from 'debug'
import { Configuration } from 'webpack'

import { Config } from '../index.js'

const debug = createDebug('bistrio:webpack')

const dev = 'development'
const prod = 'production'
type Mode = 'development' | 'production'

function isWebpackMode(webpackMode: string | undefined): webpackMode is Mode {
  return webpackMode !== undefined && [prod, dev].includes(webpackMode)
}

export type GenerateProductionConfigFunc = ({
  config,
  env,
  entry,
}: {
  config: Config
  env: Mode
  entry: Configuration['entry']
}) => Configuration

export const generateWebpackConfig = ({
  config,
  bundlerConfigPath,
  entry,
  cacheName,
  generateProductionConfig,
}: {
  config: Config
  bundlerConfigPath: string
  entry: Configuration['entry']
  cacheName: string
  generateProductionConfig: GenerateProductionConfigFunc
}) => {
  debug('NODE_ENV=%s', process.env.NODE_ENV)
  debug('WEBPACK_MODE=%s', process.env.WEBPACK_MODE)

  let env: Mode
  const webpackMode = process.env.WEBPACK_MODE
  if (isWebpackMode(webpackMode)) {
    env = webpackMode
  } else {
    env = !process.env.NODE_ENV || process.env.NODE_ENV === dev ? dev : prod
  }

  debug('mode=%s', env)
  if (env === 'development') {
    debug('Webpack is running in development mode...')
  }

  const webpackConfig = generateProductionConfig({ config, env, entry })

  const devConfig: Configuration = {
    ...webpackConfig,
    devtool: 'inline-source-map',
    stats: 'normal',
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [bundlerConfigPath],
      },
      cacheDirectory: path.resolve(config.structure.cacheDir, cacheName),
    },
  }

  return env === dev ? devConfig : webpackConfig
}
