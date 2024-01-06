// for REPL
import { initConfig, support } from 'bistrio'
import { routes } from '../universal/routes/all'
import { config } from '../config'
import { serverRouterConfig } from './config'
import { Middlewares } from '../universal/middlewares'

initConfig(config)

support.loadResources<Middlewares>(serverRouterConfig(), routes).catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
