import { Middlewares, nullRouterSupport, Resource, Router, RouterSupport, ServerRouterConfig } from '../../'
import { ResourceHolderCreateRouter } from './resource-holder-create-router'

declare global {
  // eslint-disable-next-line no-var
  var resources: Record<string, Resource>
}

export async function loadResources<M extends Middlewares>(
  serverRouterConfig: ServerRouterConfig,
  routes: (router: Router, support: RouterSupport<M>) => void,
) {
  const resources = {} as Record<string, Resource>

  global.resources = resources

  const router = new ResourceHolderCreateRouter(resources, serverRouterConfig, '/')
  routes(router, nullRouterSupport as RouterSupport<M>)
  await router.build()
}
