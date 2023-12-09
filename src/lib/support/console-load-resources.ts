import { Express } from 'express'
import listEndpoints from 'express-list-endpoints'
import {
  config,
  Middlewares,
  nullRouterSupport,
  Resource,
  Router,
  RouterSupport,
  ServerRouterConfig,
} from '../../index.js'
import { ServerRouterImpl } from '../server-router-impl.js'
import { ResourceHolderCreateRouter } from './resource-holder-create-router.js'

declare global {
  // eslint-disable-next-line no-var
  var resources: Record<string, Resource>

  // eslint-disable-next-line no-var
  var routes: Record<string, any>
}

export async function loadResources<M extends Middlewares>(
  serverRouterConfig: ServerRouterConfig,
  routes: (router: Router, support: RouterSupport<M>) => void,
) {
  {
    const resources = {} as Record<string, Resource>
    global.resources = resources

    const router = new ResourceHolderCreateRouter(resources, serverRouterConfig, '/')
    routes(router, nullRouterSupport as RouterSupport<M>)
    await router.build()
  }

  {
    let endpoints: listEndpoints.Endpoint[]

    const createRoutes = async (): Promise<void> => {
      if (!endpoints) {
        const conf = config()
        const router: ServerRouterImpl = new ServerRouterImpl(serverRouterConfig, conf.client)
        routes(router, nullRouterSupport as RouterSupport<M>)
        await router.build()
        endpoints = listEndpoints(router.router as Express)
      }
      outputEndpoints()
    }

    const methodLength = 25
    const outputEndpoints = () => {
      console.log(`ROUTES`)
      endpoints.map((endpoint) => {
        const methods = endpoint.methods.join(',')
        const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`
        console.log(`${methods}${' '.repeat(methodLength - methods.length)}\t${path}`)
      })
    }

    global.routes = () => {
      return createRoutes()
    }
  }
}
