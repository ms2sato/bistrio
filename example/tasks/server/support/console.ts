// for bin/console
// add modules for REPL
import { routes } from '../../isomorphic/routes/all'
import {
  nullRouterSupport,
  Resource,
  ResourceHolderCreateRouter,
  Router,
  RouterSupport,
  ServerRouterConfigCustom,
} from 'bistrio'
import { config } from '../config/server'
import { Middlewares } from '../../isomorphic/routes/middlewares'

const main = async (
  serverRouterConfig: ServerRouterConfigCustom,
  routes: (router: Router, support: RouterSupport<Middlewares>) => void
) => {
  const resources = {} as Record<string, Resource>

  // TODO: fix any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ;(global as any).resources = resources

  const router = new ResourceHolderCreateRouter(resources, serverRouterConfig, '/')
  routes(router, nullRouterSupport as RouterSupport<Middlewares>)
  await router.build()
}

main(config(), routes).catch((err: Error) => {
  console.error(`console error: ${err.message}`)
})
