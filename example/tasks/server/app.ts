import createError from 'http-errors'
import express from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import createDebug from 'debug'
import session from 'express-session'
import fileUpload from 'express-fileupload'
import { tmpdir } from 'os'
import Redis from 'ioredis'
import RedisStore from 'connect-redis'

import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'

import webpackConfig from '../config/client/webpack.config'

import { initConfig, localeMiddleware, useExpressRouter } from 'bistrio'
import { middlewares } from './middlewares'
import { localeMap } from '@universal/locales/index'
import { constructView } from './customizers/construct-view'
import { routes } from '@universal/routes/all'
import { serverRouterConfig } from './config'
import { config } from '../config'
import { init as initPassport } from './lib/passport-util'
import { purge } from './lib/lazy'

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

initConfig(config)
const debug = createDebug('bistrio:params')

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new Redis()

export async function setup() {
  const app = express()
  app.use(compression())

  const skipList = ['/js/', '/css/', '/favicon.ico']
  app.use(
    logger('dev', {
      skip: (req) => skipList.some((path) => req.originalUrl.startsWith(path)),
    }),
  )
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(
    fileUpload({
      limits: { fileSize: 50 * 1024 * 1024 },
      useTempFiles: true,
      tempFileDir: tmpdir(),
    }),
  )

  app.use(express.static('dist/public'))

  if (!process.env.SESSION_SECRET) {
    throw new Error('process.env.SESSION_SECRET is undefined')
  }

  // TODO: can configure
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      name: 'tasks.session',
      resave: false,
      saveUninitialized: false,
      store: new RedisStore({ client: redis, prefix: 'taskssess:' }),
      cookie: {
        httpOnly: true,
        secure: process.env.SECURE ? process.env.SECURE === 'true' : app.get('env') === 'production',
        sameSite: true,
      },
    }),
  )

  initPassport(app)

  app.use(
    localeMiddleware({
      defaultLanguage: 'en',
      localeMap: localeMap,
    }),
  )

  app.use((req, res, next) => {
    debug(`${req.method} ${req.path}`)

    next()
    if (debug.enabled) {
      debug(`req.params: %o`, req.params)
      debug(`req.body: %o`, req.body)
      debug(`req.query: %o`, req.query)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('webpackConfig', JSON.stringify(webpackConfig, null, 2))
    const entryObject = webpackConfig.entry as Record<string, string | string[]>
    Object.keys(entryObject).forEach(function (key) {
      entryObject[key] = ['webpack-hot-middleware/client', entryObject[key] as string]
    })
    webpackConfig.output = {
      ...webpackConfig.output!,
      clean: true,
      filename: '[name].[hash].bundle.js',
    }
    // webpackConfig.optimization = undefined
    webpackConfig.optimization = {
      moduleIds: 'deterministic', // Now, despite any new local dependencies, our vendor hash should stay consistent between builds
      // runtimeChunk: true, // see https://webpack.js.org/guides/build-performance/#minimal-entry-chunk
    }
    webpackConfig.module!.rules?.push({
      test: /\.(?:js|tsx|ts|mjs|cjs)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript', ['@babel/preset-env', { targets: 'defaults' }]],
        },
      },
    })
    // webpackConfig.cache = undefined

    webpackConfig.plugins = [new webpack.HotModuleReplacementPlugin(), new ReactRefreshWebpackPlugin({overlay: false})]
    console.log('webpackConfig', JSON.stringify(webpackConfig, null, 2))
    const compiler = webpack(webpackConfig)
    // compiler.hooks.afterEmit.tap('cleanup-the-require-cache', () => {
    //   // console.log('cleanup-the-require-cache', require.cache)
    //   const dirName = './universal'
    //   // After webpack rebuild, clear the files from the require cache,
    //   // so that next server side render will be in sync
    //   Object.keys(require.cache)
    //     .filter((key) => key.includes(dirName))
    //     .forEach((key) => {
    //       console.log('delete require.cache', key)
    //       delete require.cache[key]
    //     })

    //   purge()
    // })

    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
        serverSideRender: true,
      }),
    )
    app.use(
      webpackHotMiddleware(compiler, {
        log: console.log,
      }),
    )
  }

  await useExpressRouter({ app, middlewares, routes, constructView, serverRouterConfig: serverRouterConfig() })

  // error handler
  app.use(function (err: unknown, req, res, _next) {
    // @see https://stackoverflow.com/questions/51624117/how-to-check-for-the-property-type-of-an-unknown-value
    const isHttpError = (err: unknown): err is createError.HttpError<number> => {
      const herr = err as createError.HttpError<number>
      return 'status' in herr && typeof herr.status === 'number'
    }

    console.error(err)

    // TODO: handling RecordNotFound of prisma

    // render the error page
    res.status(isHttpError(err) ? err.status : 500)

    // TODO: render any error info accoding to the Content-Type
    res.json({ err })
  } as express.ErrorRequestHandler)

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    next(createError(404))
  })

  return app
}
