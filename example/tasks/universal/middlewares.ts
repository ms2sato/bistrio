import { RequestHandler } from 'express'
import { Middlewares as BMiddlewares } from 'bistrio'

export interface Middlewares extends BMiddlewares {
  checkLoggedIn: () => RequestHandler
  checkAdmin: () => RequestHandler
}
