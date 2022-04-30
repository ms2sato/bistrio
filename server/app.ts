// TODO: fix
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import createDebug from 'debug'
import methodOverride from 'method-override'

import { ServerRouter } from 'restrant2'
import { routes } from '../routes'
import * as RouterFactory from './router-factory'
import { useTsxView } from './customizers/react-ssr'

const debug = createDebug('bistrio:params')

export async function setup() {
  const app = express()

  useTsxView(app, path.join(__dirname, '../views'))

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

  app.use((req, res, next) => {
    debug(`${req.method} ${req.path}`)

    next()
    if (debug.enabled) {
      debug(`req.params: %o`, req.params)
      debug(`req.body: %o`, req.body)
      debug(`req.query: %o`, req.query)
    }
  })

  const router: ServerRouter = RouterFactory.setup().getServerRouter(__dirname)
  routes(router)
  app.use(router.router)
  await router.build()

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404))
  })

  // error handler
  app.use(function (err, req, res, _next) {
    // render the error page
    if ('status' in err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      res.status(Number(err.status))
    } else {
      res.status(500)
    }

    if (req.app.get('env') === 'development') {
      console.error(err)
    }

    res.render('error', { err })
  } as express.ErrorRequestHandler)

  return app
}
