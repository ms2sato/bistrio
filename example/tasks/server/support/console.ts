// for bin/console
// add modules for REPL
import { routes } from '../../routes/all'
import path from 'path'
import { getRouterFactory } from 'bistrio'
import { config } from '../config/server'

const router = getRouterFactory(config()).getResourceHolderCreateRouter(global, path.join(__dirname, '..'))
routes(router)
router.build().catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
