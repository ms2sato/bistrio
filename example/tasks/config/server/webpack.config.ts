import { resolve } from 'node:path'
import * as webpack from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
const nodeExternals = require('webpack-node-externals')
//import { fileURLToPath } from 'url';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configFile = resolve(__dirname, '../../tsconfig.json')

const config: webpack.Configuration = {
  target: 'node',
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  mode: 'development', // TODO: fix later
  entry: resolve(__dirname, '../../server/server.ts'),
  output: {
    path: resolve(__dirname, '../../dist/server'),
    filename: 'server.js',
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
