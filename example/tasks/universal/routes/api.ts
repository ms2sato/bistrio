import { Router, RouterSupport, scope, api, fileSchema } from 'bistrio/client'
import { Middlewares } from '../middlewares'

export function routes(r: Router, _support: RouterSupport<Middlewares>) {
  scope(r, 'api', (r) => {
    r.resources('users', {
      name: 'apiUsers',
      actions: api('create'),
      construct: {
        create: { schema: fileSchema },
      },
    })
  })
}
