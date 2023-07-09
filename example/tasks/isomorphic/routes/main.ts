import { RouterSupport, Router, Actions, idNumberSchema, scope } from 'bistrio/client'
import { commentCreateSchema, commentUpdateSchema, taskCreateWithTagsSchema, taskIdSchema, taskUpdateWithTagsSchema } from '../params'
import { Middlewares } from './middlewares'

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  router = router.sub('/', support.middlewares.checkLoggedIn())

  router.resources('/', {
    name: 'root',
    actions: Actions.page({ only: ['index'] }),
  })

  const mainRouter = router.sub('/')
  mainRouter.options({ hydrate: true }).resources('/tasks', {
    name: 'task',
    actions: Actions.page(),
  })

  scope(router, '/api', (apiRouter) => {
    apiRouter.resources('/tasks', {
      construct: {
        create: { schema: taskCreateWithTagsSchema },
        update: { schema: taskUpdateWithTagsSchema },
        done: { schema: idNumberSchema },
      },
      name: 'api_task',
      actions: [...Actions.api(), { action: 'done', path: '/:id/done', method: 'post' }],
    })

    scope(apiRouter, '/tasks/:taskId', (tasksRouter) => {
      tasksRouter.resources('/comments', {
        construct: {
          index: { schema: taskIdSchema },
          create: { schema: commentCreateSchema },
          update: { schema: commentUpdateSchema },
        },
        name: 'api_task_comment',
        actions: Actions.api({ only: ['index', 'create', 'update'] }),
      })
    })
  })
}
