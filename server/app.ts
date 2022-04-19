import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import createDebug from 'debug'
import methodOverride from 'method-override'

import { ServerRouter } from 'restrant2'
import { routes } from '../routes'
import { setup } from './router-factory'

const debug = createDebug('bistrio:params')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../public')))

const methodOverrideKey = '_method'

// @see http://expressjs.com/en/resources/middleware/method-override.html
app.use(
  methodOverride(function (req, _res) {
    if (req.body && typeof req.body === 'object' && methodOverrideKey in req.body) {
      // look in urlencoded POST bodies and delete it
      const method = req.body._method
      delete req.body._method
      return method
    }
  })
)

app.use(methodOverride(methodOverrideKey, { methods: ['GET', 'POST'] })) // for GET Parameter

app.use((req, res, next) => {
  debug(`${req.method} ${req.path}`)

  next()
  if (debug.enabled) {
    debug(`req.params: %o`, req.params)
    debug(`req.body: %o`, req.body)
    debug(`req.query: %o`, req.query)
  }
})

const router: ServerRouter = setup().getServerRouter(__dirname)
routes(router)
app.use(router.router)
router.build() // TODO: await

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
} as express.ErrorRequestHandler)

export default app
