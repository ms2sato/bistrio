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
    name: 'task',
    actions: Actions.standard({ only: ['index', 'build', 'edit'] }),
  })

  const apiRouter = router.sub('/api')
  apiRouter.resources('/tasks', {
    construct: {
      create: { schema: taskCreateSchema },
      update: { schema: taskUpdateSchema },
      done: { schema: idNumberSchema },
    },
    name: 'api_task',
    actions: [...Actions.api(), { action: 'done', path: '/:id/done', method: 'post' }],
  })
}
