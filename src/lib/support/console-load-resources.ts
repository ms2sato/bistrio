import {
  Middlewares,
  nullRouterSupport,
  Resource,
  ResourceHolderCreateRouter,
  Router,
  RouterSupport,
  ServerRouterConfigCustom,
} from '../../'

export async function loadResources<M extends Middlewares>(
  serverRouterConfig: ServerRouterConfigCustom,
  routes: (router: Router, support: RouterSupport<M>) => void
) {
  const resources = {} as Record<string, Resource>

  // TODO: fix any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ;(global as any).resources = resources

  const router = new ResourceHolderCreateRouter(resources, serverRouterConfig, '/')
  routes(router, nullRouterSupport as RouterSupport<M>)
  await router.build()
}
