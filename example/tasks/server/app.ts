import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import createDebug from 'debug'
import session from 'express-session'
import Redis from 'ioredis'
import RedisStore from 'connect-redis'

import { initConfig, localeMiddleware, useExpressRouter } from 'bistrio'
import { checkAdmin, checkLoggedIn } from './middlewares'
import { localeMap } from '@universal/locales/index'
import { constructView } from './customizers/construct-view'
import { routes } from '@universal/routes/all'
import { Middlewares } from '@/universal/routes/middlewares'
import { serverRouterConfig } from './config/server'
import { config } from '../config'
import { init as initPassport } from './lib/passport-util'

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

initConfig(config)
const debug = createDebug('bistrio:params')

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new Redis()

export async function setup() {
  const app = express()

  app.use(logger('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(express.static(path.join(__dirname, '../public')))

  if (process.env.NODE_ENV == 'development') {
    const staticPathDev = path.join(__dirname, '../../public')
    app.use(express.static(staticPathDev))
  }

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

  const middlewares: Middlewares = {
    checkAdmin,
    checkLoggedIn,
  }

  await useExpressRouter({ app, middlewares, routes, constructView, serverRouterConfig: serverRouterConfig() })

  // error handler
  app.use(function (err: unknown, req, res, _next) {
    // @see https://stackoverflow.com/questions/51624117/how-to-check-for-the-property-type-of-an-unknown-value
    const isHttpError = (err: unknown): err is createError.HttpError<number> => {
      const herr = err as createError.HttpError<number>
      return 'status' in herr && typeof herr.status === 'number'
    }

    if (req.app.get('env') === 'development') {
      console.error(err)
    }

    // TODO: handling RecordNotFound of prisma

    // render the error page
    res.status(isHttpError(err) ? err.status : 500)
    // res.render('error', { err })
  } as express.ErrorRequestHandler)

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    next(createError(404))
  })

  return app
}
