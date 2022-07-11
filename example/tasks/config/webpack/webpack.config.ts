import path from 'path'
import { Configuration } from 'webpack'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import { entries } from '../../routes/_entries'

const prod = 'production'
const dev = 'development'
const env = process.env.NODE_ENV === prod ? prod : dev

const configFile = path.join(__dirname, `tsconfig.client.${env}.json`)
if (env === 'development') {
  console.log('Webpack is running in development mode...')
  console.log(`tsconfig: ${configFile}`)
}

const entry = Object.keys(entries).reduce<Record<string, string>>((obj, name) => {
  obj[name] = `./.bistrio/routes/${name}/_entry.ts`
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
            configFile: configFile,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile, extensions: ['.tsx', '.ts', '.js'] })],
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
    path: path.resolve(__dirname, '../../dist', 'public'),
  },
}

export default env === dev ? devConfig : prodConfig
