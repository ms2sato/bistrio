import * as express from 'express'

export type Middlewares = {
  checkLoggedIn(): express.RequestHandler
  checkAdmin(): express.RequestHandler
}
