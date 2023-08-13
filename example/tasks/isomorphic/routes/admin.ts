import { Router, Actions, RouterSupport } from 'bistrio/client'
import { routes as mainRoutes } from './main'
import { Middlewares } from './middlewares'
import AdminLayout from '../components/AdminLayout'

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  mainRoutes(router, support)

  const adminRouter = router.options({ hydrate: true }).layout({ element: AdminLayout }).sub('/admins/:adminId')
  adminRouter.resources('/users', {
    name: 'page_admin_user',
    actions: Actions.page({ only: ['index'] }),
  })
}
