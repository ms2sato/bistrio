import path from 'path'
import type { Application } from 'express'
import webpack, { Configuration } from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import { EntriesConfig } from '../'

export function useWebpackDev(app: Application, webpackConfig: Configuration) {
  if (process.env.NODE_ENV !== 'production') {
    const compiler = webpack(webpackConfig)

    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output?.publicPath,
      })
    )
  }
}

export type GenerateWebpackConfigParams = {
  entries: EntriesConfig
  baseDir: string
}

export const generateWebpackCoonfig = ({ entries, baseDir }: GenerateWebpackConfigParams) => {
  console.log(`NODE_ENV=${process.env.NODE_ENV}`)

  const prod = 'production'
  const dev = 'development'
  const env = process.env.NODE_ENV === dev ? dev : prod

  const configFile = path.join(baseDir, 'config', 'client', `tsconfig.client.${env}.json`)
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
      path: path.resolve(baseDir, 'dist', 'public'),
    },
  }

  return env === dev ? devConfig : prodConfig
}
