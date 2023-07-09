import { routes as mainRoutes } from './main'
import { Middlewares } from './middlewares'
import { Router, Actions, RouterSupport } from 'bistrio/client'

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  mainRoutes(router, support)

  const adminRouter = router.sub('/admins/:adminId')
  adminRouter.resources('/users', {
    name: 'admin_user',
    actions: Actions.page({ only: ['index'] }),
  })
}
