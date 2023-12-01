import { lazy } from 'react'
import { RouterSupport, Router, Actions, idNumberSchema, scope, pageSchema, blankSchema } from 'bistrio/client'
import {
  commentCreateSchema,
  commentUpdateSchema,
  sessionCreateSchema,
  taskCreateWithTagsSchema,
  taskIdSchema,
  taskUpdateWithTagsSchema,
} from '../params'
import { Middlewares } from './middlewares'
import TaskLayout from '../components/tasks/TaskLayout'

const UserLayout = lazy(() => import('../components/UserLayout'))

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  router = router.layout({ Component: UserLayout }).options({ hydrate: true })

  router.pages('/', ['/'])

  scope(router, '/', (pageRouter) => {
    pageRouter.pages('/auth', ['login'])

    scope(pageRouter, '/', (pageRouter) => {
      pageRouter = pageRouter.sub('/', support.middlewares.checkLoggedIn())
      pageRouter.layout({ element: TaskLayout }).pages('/tasks', ['/', '$id', 'build', '/$id/edit'])
    })
  })

  scope(router, '/api', (apiRouter) => {
    apiRouter.resources('/auth', {
      name: 'auth',
      construct: {
        user: { schema: blankSchema },
        verify: { schema: sessionCreateSchema, sources: ['body'] },
        create: { schema: blankSchema },
        logout: { schema: blankSchema },
      },
      actions: [
        { action: 'user', path: '/user', method: 'get' },
        { action: 'create', path: '/', method: 'post' },
        { action: 'verify', path: '/session', method: 'patch' },
        { action: 'logout', path: '/session', method: 'delete' },
      ],
    })

    apiRouter.resources('/tasks', {
      construct: {
        index: { schema: pageSchema, sources: ['query', 'params'] },
        create: { schema: taskCreateWithTagsSchema },
        update: { schema: taskUpdateWithTagsSchema },
        done: { schema: idNumberSchema },
      },
      name: 'task',
      actions: [...Actions.api(), { action: 'done', path: '/$id/done', method: 'post' }],
    })

    scope(apiRouter, '/tasks/$taskId', (taskRouter) => {
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
