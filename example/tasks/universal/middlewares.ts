import { RequestHandler } from 'express'
import { Middlewares as BMiddlewares } from 'bistrio/client'

export interface Middlewares extends BMiddlewares {
  checkLoggedIn: () => RequestHandler
  checkAdmin: () => RequestHandler
}
