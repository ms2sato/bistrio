import { lazy } from 'react'
import { RouterSupport, Router, Actions, idNumberSchema, scope, pageSchema, blankSchema } from 'bistrio/client.js'
import {
  commentCreateSchema,
  commentUpdateSchema,
  sessionCreateSchema,
  taskCreateWithTagsSchema,
  taskIdSchema,
  taskUpdateWithTagsSchema,
} from '../params.ts'
import { Middlewares } from './middlewares.ts'
import TaskLayout from '../components/tasks/TaskLayout.tsx'

const UserLayout = lazy(() => import('../components/UserLayout.tsx'))

export function routes(router: Router, support: RouterSupport<Middlewares>) {
  router = router.layout({ Component: UserLayout }).options({ hydrate: true })

  router.resources('/', {
    name: 'page_root',
    actions: Actions.page({ only: ['index'] }),
  })

  scope(router, '/', (pageRouter) => {
    pageRouter.resources('/auth', {
      name: 'page_auth',
      actions: [{ action: 'login', path: '/login', method: 'get', page: true }],
      construct: {
        login: { schema: blankSchema },
      },
    })

    scope(pageRouter, '/', (pageRouter) => {
      pageRouter = pageRouter.sub('/', support.middlewares.checkLoggedIn())

      pageRouter.layout({ element: TaskLayout }).resources('/tasks', {
        name: 'page_task',
        actions: Actions.page(),
      })
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
        { action: 'verify', path: '/session', method: 'put' },
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
