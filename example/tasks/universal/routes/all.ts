import { Router, RouterSupport } from 'bistrio/client'

import { Middlewares } from '../middlewares'
import { routes as adminRoutes } from './admin'
import { routes as apiRoutes } from './api'

export function routes(r: Router, support: RouterSupport<Middlewares>) {
  apiRoutes(r, support)
  adminRoutes(r, support)
}
