import { Router, Actions } from 'restrant2/client'
import { routes as mainRoutes } from './main'

export function routes(router: Router) {
  mainRoutes(router)

  const adminRouter = router.sub('/admins/:adminId')
  adminRouter.resources('/users', {
    name: 'admin_user',
    actions: Actions.standard({ only: ['index'] }),
  })
}
