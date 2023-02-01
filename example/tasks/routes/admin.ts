import { Router, Actions } from 'restrant2/client'
import { routes as mainRoutes } from './main'
import { Middlewares } from '../routes/_middlewares'
import { RouterSupport } from 'bistrio'

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  mainRoutes(router, support)

  const adminRouter = router.sub('/admins/:adminId')
  adminRouter.resources('/users', {
    name: 'admin_user',
    actions: Actions.standard({ only: ['index'] }),
  })
}
