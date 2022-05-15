import path from 'path'
import { Configuration } from 'webpack'

const env = process.env.NODE_ENV == 'production' ? 'production' : 'development'

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
}

const prodConfig: Configuration = {
  ...config,
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist', 'public'),
  },
}

export default env != 'development' ? devConfig : prodConfig
