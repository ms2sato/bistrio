import { RouterSupport, Router, Actions, idNumberSchema, scope } from 'bistrio/client'
import { commentCreateSchema, commentUpdateSchema, pageSchema, taskCreateWithTagsSchema, taskIdSchema, taskUpdateWithTagsSchema } from '../params'
import { Middlewares } from './middlewares'

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  router = router.sub('/', support.middlewares.checkLoggedIn())

  router.resources('/', {
    name: 'page_root',
    actions: Actions.page({ only: ['index'] }),
  })

  const mainRouter = router.sub('/')
  mainRouter.options({ hydrate: true }).resources('/tasks', {
    name: 'page_task',
    actions: Actions.page(),
  })

  scope(router, '/api', (apiRouter) => {
    apiRouter.resources('/tasks', {
      construct: {
        index: { schema: pageSchema, sources: ['query', 'params'] },
        create: { schema: taskCreateWithTagsSchema },
        update: { schema: taskUpdateWithTagsSchema },
        done: { schema: idNumberSchema },
      },
      name: 'task',
      actions: [...Actions.api(), { action: 'done', path: '/:id/done', method: 'post' }],
    })

    scope(apiRouter, '/tasks/:taskId', (taskRouter) => {
      taskRouter.resources('/comments', {
        construct: {
          index: { schema: taskIdSchema },
          create: { schema: commentCreateSchema },
          update: { schema: commentUpdateSchema },
        },
        name: 'task_comment',
        actions: Actions.api({ only: ['index', 'create', 'update'] }),
      })
    })
  })
}
