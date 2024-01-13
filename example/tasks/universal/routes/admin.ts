import { Router, crud, RouterSupport, scope, api } from 'bistrio/client'
import { routes as mainRoutes } from './main'
import { Middlewares } from '../middlewares'
import AdminLayout from '../components/AdminLayout'
import { adminUserBatchCreateSchema, adminUserBatchListSchema } from '../params'

export function routes(r: Router, support: RouterSupport<Middlewares>) {
  mainRoutes(r, support)

  r.options({ hydrate: true })
  scope(r, 'admin', (r) => {
    r.layout({ element: AdminLayout })

    r.resources('users', {
      name: 'adminUsers',
      actions: crud('index', 'list'),
      construct: {
        list: { schema: adminUserBatchListSchema },
      },
    })

    r.resources('users/batch', {
      name: 'adminUserBatch',
      actions: api('create'),
      construct: {
        create: { schema: adminUserBatchCreateSchema },
      },
    })
  })
}
