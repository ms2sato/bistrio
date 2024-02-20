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
import { Middlewares } from '../middlewares'
import TaskLayout from '../components/tasks/TaskLayout'

const UserLayout = lazy(() => import(/* webpackMode: "eager" */ '../components/UserLayout'))

export function routes(r: Router, support: RouterSupport<Middlewares>) {
  r = r.layout({ Component: UserLayout }).options({ hydrate: true })

  r.pages('/', ['/'])

  scope(r, (r) => {
    r.resources('auth', {
      name: 'auth',
      actions: [
        { action: 'login', path: 'login', method: 'get', page: true },
        { action: 'user', path: 'user', method: 'get' },
        { action: 'verify', path: 'session', method: 'patch' },
        { action: 'logout', path: 'session', method: 'delete' },
      ],
      inputs: {
        login: blankSchema,
        user: blankSchema,
        verify: { schema: sessionCreateSchema, sources: ['body'] },
        logout: blankSchema,
      },
    })
  })

  scope(r, (r) => {
    r = r.sub('/', support.middlewares.checkLoggedIn()) // add middleware and new router
    r = r.layout({ element: TaskLayout }) // set layout

    r.resources('tasks', {
      name: 'tasks',
      actions: [...crud(), { action: 'done', path: '$id/done', method: 'post', type: 'json' }],
      inputs: {
        list: { schema: pageSchema, sources: ['query', 'params'] },
        create: taskCreateWithTagsSchema,
        update: taskUpdateWithTagsSchema,
        done: idNumberSchema,
      },
    })

    r.resources('tasks/$taskId/comments', {
      name: 'taskComments',
      actions: api('list', 'create', 'update'),
      inputs: {
        list: taskIdSchema,
        create: commentCreateSchema,
        update: commentUpdateSchema,
      },
    })
  })
}
