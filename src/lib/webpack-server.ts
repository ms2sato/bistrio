import { resolve } from 'node:path'
import createDebug from 'debug'
import { ConfigCustom, initConfig } from './config.js'
import { generateWebpackConfig } from './webpack-base.js'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import nodeExternals from 'webpack-node-externals'
import { Configuration } from 'webpack'

const debug = createDebug('bistrio:webpack')

export const generateServerWebpackConfig = ({
  config: custom,
  bundlerConfigPath,
}: {
  config: ConfigCustom
  bundlerConfigPath: string
}) => {
  const config = initConfig(custom)
  const cacheName = 'webpack-server'

  const entry: Configuration['entry'] = {
    boot: resolve(config.structure.serverDir, 'boot.ts'),
    console: resolve(config.structure.serverDir, 'console.ts'),
  }
  const output = {
    path: resolve(config.structure.distDir, 'server'),
    filename: '[name].cjs',
  }

  return generateWebpackConfig({
    config,
    bundlerConfigPath,
    entry,
    cacheName,
    generateProductionConfig: ({ env, entry }) => {
      const configFile = resolve(config.structure.configDir, 'server', `tsconfig.${env}.json`)
      if (env === 'development') {
        debug('tsconfig: %s', configFile)
      }

      return {
        target: 'node20.10',
        externalsPresets: { node: true },
        externals: [nodeExternals({ importType: 'module' })], // @see https://stackoverflow.com/questions/75758573/webpack-node-esm-generates-require-rather-import
        mode: env,
        entry,
        output,
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
    },
  })
}
