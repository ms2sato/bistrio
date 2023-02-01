import * as express from 'express'
import { nullMiddlewares } from './null-middlewares'

type Callback = express.RequestHandler | (() => void)

export type Middlewares = {
  [name: string]: (...args: any[]) => Callback
}

export type RouterSupport<M extends Middlewares = Middlewares> = {
  middlewares(): M
}

export const nullRouterSupport: RouterSupport<Middlewares> = {
  middlewares() {
    return nullMiddlewares
  },
}
