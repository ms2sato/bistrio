// for REPL
import { support } from 'bistrio'
import { routes } from '../../isomorphic/routes/all'
import { config } from '../config/server'
import { Middlewares } from '../../isomorphic/routes/middlewares'

support.loadResources<Middlewares>(config(), routes).catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
