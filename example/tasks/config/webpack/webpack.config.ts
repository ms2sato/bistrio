import path from 'path'
import { Configuration } from 'webpack'
import { entries } from '../../routes/_entries'

const prod = 'production'
const dev = 'development'
const env = process.env.NODE_ENV === prod ? prod : dev

if (env === 'development') {
  console.log('Webpack is running in development mode...')
}

const entry = Object.keys(entries).reduce<Record<string, string>>((obj, name) => {
  obj[name] = `./client/${name}.tsx`
  return obj
}, {})

const config: Configuration = {
  entry,
  mode: env,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: `config/webpack/tsconfig.client.${env}.json`,
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
    filename: '[name].js',
    publicPath: '/',
  },
  stats: 'normal',
}

const prodConfig: Configuration = {
  ...config,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist', 'public'),
  },
}

export default env === dev ? devConfig : prodConfig
