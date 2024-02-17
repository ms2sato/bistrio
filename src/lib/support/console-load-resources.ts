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

  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var routes: Record<string, any>
}

export async function loadResources<M extends Middlewares>(
  serverRouterConfig: ServerRouterConfig,
  routes: (router: Router, support: RouterSupport<M>) => void,
  extensions: Record<string, unknown> = {},
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

    const pad = (str: string, length: number) => {
      const repeatCount = length - str.length
      return `${str}${' '.repeat(repeatCount > 1 ? repeatCount : 1)}`
    }

    const outputEndpoints = () => {
      console.log(`ROUTES`)
      endpoints.map((endpoint): void => {
        const methodsStr = endpoint.methods.join(',')
        const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`
        console.log(`${pad(methodsStr, 25)}\t${pad(path, 40)}\t${endpoint.middlewares.join(',')}`)
      })
    }

    global.routes = () => {
      return createRoutes()
    }

    Object.assign(global, extensions)
  }
}
