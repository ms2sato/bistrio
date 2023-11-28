import { resolve, dirname } from 'node:path'
import * as webpack from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import nodeExternals from 'webpack-node-externals'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const configFile = resolve(__dirname, '../../tsconfig.json')

const config: webpack.Configuration = {
  target: 'node',
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  mode: 'development', // TODO: fix later
  entry: resolve(__dirname, '../../server/server.ts'),
  output: {
    path: resolve(__dirname, '../../dist/server'),
    filename: 'server.cjs',
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
    extensions: ['.*', '.js', '.jsx', '.json', '.ts', '.tsx'],
  },
}

export default config
