import { idSchema, taskCreateSchema, taskUpdateSchema } from './params'
import { Router, Actions } from 'restrant2'

export async function routes(router: Router) {
  await router.resources('/tasks', {
    construct: {
      create: { schema: taskCreateSchema },
      edit: { schema: idSchema },
      update: { schema: taskUpdateSchema },
      destroy: { schema: idSchema },
      done: { schema: idSchema },
    },
    name: 'task',
    actions: [...Actions.standard({ except: ['show'] }), { action: 'done', path: '/:id/done', method: 'post' }],
  })

  const adminRouter = router.sub('/admins/:adminId')
  await adminRouter.resources('/users', {
    name: 'adminUser',
    actions: Actions.standard({ only: ['index'] }),
  })
}
