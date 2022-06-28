import type __Resource0 from '../../server/endpoint/tasks/resource'
import type __Resource1 from '../../server/endpoint/admins/:adminId/users/resource'
import type __Resource2 from '../../server/endpoint/api/tasks/resource'
    
export type Resources = {
  '/tasks': ReturnType<typeof __Resource0>
  '/admins/:adminId/users': ReturnType<typeof __Resource1>
  '/api/tasks': ReturnType<typeof __Resource2>
}    
