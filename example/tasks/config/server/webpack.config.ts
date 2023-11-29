import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Configuration } from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import nodeExternals from 'webpack-node-externals'
import { initConfig } from 'bistrio'
import { config } from '../../config/index.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const configFile = resolve(__dirname, '../../tsconfig.json')
const bistrioConfig = initConfig(config)
const structureConfig = bistrioConfig.structure

const webpackConfig: Configuration = {
  target: 'node20.10',
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  mode: 'development', // TODO: fix later
  entry: resolve(__dirname, '../../server/boot.ts'),
  output: {
    path: resolve(__dirname, '../../dist/server'),
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
    extensions: ['', '.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
    cacheDirectory: resolve(structureConfig.cacheDir, 'webpack-server'),
  },
}

export default webpackConfig
