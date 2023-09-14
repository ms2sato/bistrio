// for REPL
import { support } from 'bistrio'
import { routes } from '../../isomorphic/routes/all'
import { serverRouterConfig } from '../config/server'
import { Middlewares } from '../../isomorphic/routes/middlewares'

support.loadResources<Middlewares>(serverRouterConfig(), routes).catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
