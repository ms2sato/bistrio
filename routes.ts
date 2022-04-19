import { taskCreateSchema, taskUpdateSchema } from './params'
import { Router, Actions, idNumberSchema} from 'restrant2'

export function routes(router: Router) {
  router.resources('/tasks', {
    construct: {
      create: { schema: taskCreateSchema },
      update: { schema: taskUpdateSchema },
      done: { schema: idNumberSchema },
    },
    name: 'task',
    actions: [...Actions.standard({ except: ['show'] }), { action: 'done', path: '/:id/done', method: 'post' }],
  })

  const adminRouter = router.sub('/admins/:adminId')
  adminRouter.resources('/users', {
    name: 'admin_user',
    actions: Actions.standard({ only: ['index'] }),
  })
}
