// for REPL
import { initConfig, support } from 'bistrio'
import { routes } from '../universal/routes/all'
import { config } from '../config'
import { serverRouterConfig } from './config/server'
import { Middlewares } from '../universal/routes/middlewares'

initConfig(config)

support.loadResources<Middlewares>(serverRouterConfig(), routes).catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
