import path from 'path'
import { Configuration } from 'webpack'

const prod = 'production'
const dev = 'development'
const env = process.env.NODE_ENV === prod ? prod : dev

const config: Configuration = {
  entry: './client/index.tsx',
  mode: env,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: `tsconfig.client.${env}.json`,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
}

const devConfig: Configuration = {
  ...config,
  devtool: 'inline-source-map',
  output: {
    filename: 'bundle.js',
    publicPath: '/',
  },
  stats: 'normal',
}

const prodConfig: Configuration = {
  ...config,
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist', 'public'),
  },
}

export default env === dev ? devConfig : prodConfig
