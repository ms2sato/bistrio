import type r from './server/endpoint/tasks/resource'
import type ar from './server/endpoint/api/tasks/resource'
import type au from './server/endpoint/admins/:adminId/users/resource'

export type Resources = {
  '/tasks': ReturnType<typeof r>,
  '/api/tasks': ReturnType<typeof ar>,
  '/admin/:adminId/users': ReturnType<typeof au>
}
