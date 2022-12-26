import { Router, Actions, idNumberSchema } from 'restrant2/client'
import { taskCreateSchema, taskUpdateSchema } from '../params'

export function routes(router: Router) {
  router.resources('/', {
    name: 'root',
    actions: Actions.standard({only: ['index']})
  })

  router.resources('/tasks', {
    construct: {
      create: { schema: taskCreateSchema },
      update: { schema: taskUpdateSchema },
      done: { schema: idNumberSchema },
    },
    name: 'task',
    actions: [...Actions.standard({ except: ['show'] }), { action: 'done', path: '/:id/done', method: 'post' }],
  })

  const apiRouter = router.sub('/api')
  apiRouter.resources('/tasks', {
    name: 'api_task',
    actions: Actions.api({ only: ['index', 'show'] }),
  })
}
