import { RouterSupport, Router, Actions, idNumberSchema } from 'bistrio/client'
import { taskCreateSchema, taskUpdateSchema } from '../params'
import { Middlewares } from './middlewares'

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  router = router.sub('/', support.middlewares.checkLoggedIn())

  router.resources('/', {
    name: 'root',
    actions: Actions.standard({ only: ['index'] }),
  })

  const mainRouter = router.sub('/')
  mainRouter.options({ hydrate: true }).resources('/tasks', {
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
