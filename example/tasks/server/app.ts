import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import createDebug from 'debug'
import methodOverride from 'method-override'

import { ServerRouter } from 'restrant2'
import { useWebpackDev, localeMiddleware, getRouterFactory } from 'bistrio'

import { routes } from '../routes/all'
import { useTsxView } from './customizers/render-support'

import { localeMap } from '../locales/index'
import webpackConfig from '../webpack.config'
import { config } from './config/server'

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

const debug = createDebug('bistrio:params')

export async function setup() {
  const app = express()

  useTsxView(app, path.join(__dirname, '../views'))
  useWebpackDev(app, webpackConfig)

  app.use(logger('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(express.static(path.join(__dirname, '../public')))

  // @see http://expressjs.com/en/resources/middleware/method-override.html
  type BodyType = {
    _method?: string
  }

  const methodName = '_method'

  // @see http://expressjs.com/en/resources/middleware/method-override.html
  app.use(
    methodOverride(function (req, _res) {
      if (req.body && typeof req.body === 'object' && methodName in req.body) {
        const body = req.body as BodyType
        const method = body[methodName]
        if (!method) {
          throw new Error('Unreachable')
        }
        // look in urlencoded POST bodies and delete it
        delete body[methodName]
        return method
      }
      return req.method
    })
  )
  app.use(methodOverride(methodName, { methods: ['GET', 'POST'] })) // for GET Parameter

  app.use(
    localeMiddleware({
      defaultLanguage: 'en',
      localeMap: localeMap,
    })
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

  const router: ServerRouter = getRouterFactory(config()).getServerRouter(__dirname)
  routes(router)
  app.use(router.router)
  await router.build()

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404))
  })

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

  return app
}
