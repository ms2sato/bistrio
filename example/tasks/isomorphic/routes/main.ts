import { RouterSupport, Router, Actions, idNumberSchema } from 'bistrio/client'
import { commentCreateSchema, commentUpdateSchema, taskCreateSchema, taskUpdateSchema } from '../params'
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
    actions: Actions.standard({ only: ['index', 'build', 'edit', 'show'] }),
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

  apiRouter.sub('/tasks/:taskId').resources('/comments', {
    construct: {
      create: { schema: commentCreateSchema },
      update: { schema: commentUpdateSchema },
    },
    name: 'api_task_comment',
    actions: Actions.api({ only: ['create', 'update'] }),
  })
}
