import { resolve } from 'node:path'
import createDebug from 'debug'
import { ConfigCustom, initConfig } from './config.js'
import { GenerateProductionConfigFunc, generateWebpackConfig } from './webpack-base.js'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import nodeExternals from 'webpack-node-externals'

const debug = createDebug('bistrio:webpack')

const generateServerProductionConfig: GenerateProductionConfigFunc = ({ config, env, entry }) => {
  const structureConfig = config.structure
  const configFile = resolve(structureConfig.configDir, 'server', `tsconfig.server.${env}.json`)
  if (env === 'development') {
    debug('tsconfig: %s', configFile)
  }

  return {
    target: 'node20.10',
    externalsPresets: { node: true },
    externals: [nodeExternals()],
    mode: env,
    entry,
    output: {
      path: resolve(structureConfig.distDir, 'server'),
      filename: 'boot.cjs',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      plugins: [new TsconfigPathsPlugin({ configFile, extensions: ['.tsx', '.ts', '.js'] })],
      extensions: ['', '.tsx', '.ts', '.js'],
    },
  }
}

export const generateServerWebpackConfig = ({
  config: custom,
  bundlerConfigPath,
}: {
  config: ConfigCustom
  bundlerConfigPath: string
}) => {
  const config = initConfig(custom)
  const entry = resolve(config.structure.serverDir, 'boot.ts')
  const cacheName = 'webpack-server'

  return generateWebpackConfig({
    config,
    bundlerConfigPath,
    entry,
    cacheName,
    generateProductionConfig: generateServerProductionConfig,
  })
}
