import { lazy } from 'react'
import { RouterSupport, Router, api, idNumberSchema, scope, pageSchema, blankSchema, crud } from 'bistrio/client'
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

const UserLayout = lazy(() => import(/* webpackMode: "eager" */ '../components/UserLayout'))

export function routes(r: Router, support: RouterSupport<Middlewares>) {
  r = r.layout({ Component: UserLayout }).options({ hydrate: true })

  r.pages('/', ['/'])

  r.resources('auth', {
    name: 'auth',
    construct: {
      login: { schema: blankSchema },
      user: { schema: blankSchema },
      verify: { schema: sessionCreateSchema, sources: ['body'] },
      create: { schema: blankSchema },
      logout: { schema: blankSchema },
    },
    actions: [
      { action: 'login', path: 'login', method: 'get', page: true },
      { action: 'user', path: 'user', method: 'get' },
      { action: 'create', path: '/', method: 'post' },
      { action: 'verify', path: 'session', method: 'patch' },
      { action: 'logout', path: 'session', method: 'delete' },
    ],
  })

  scope(r, (r) => {
    r = r.sub('/', support.middlewares.checkLoggedIn()) // add middleware and new router
    r = r.layout({ element: TaskLayout }) // set layout

    r.resources('tasks', {
      construct: {
        list: { schema: pageSchema, sources: ['query', 'params'] },
        create: { schema: taskCreateWithTagsSchema },
        update: { schema: taskUpdateWithTagsSchema },
        done: { schema: idNumberSchema },
      },
      name: 'tasks',
      actions: [...crud(), { action: 'done', path: '$id/done', method: 'post', type: 'json' }],
    })

    scope(r, 'tasks/$taskId', (r) => {
      r.resources('comments', {
        construct: {
          list: { schema: taskIdSchema },
          create: { schema: commentCreateSchema },
          update: { schema: commentUpdateSchema },
        },
        name: 'taskComments',
        actions: api('list', 'create', 'update'),
      })
    })
  })
}
