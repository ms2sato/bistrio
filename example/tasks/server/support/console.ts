// for bin/console
// add modules for REPL
import { routes } from '../../isomorphic/routes/all'
import path from 'path'
import { getRouterFactory, nullRouterSupport, RouterSupport } from 'bistrio'
import { config } from '../config/server'
import { Middlewares } from '@/isomorphic/routes/middlewares'

const router = getRouterFactory(config()).getResourceHolderCreateRouter(global, path.join(__dirname, '..'))
routes(router, nullRouterSupport as RouterSupport<Middlewares>)
router.build().catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
