import * as express from 'express'
import { nullMiddlewares } from './null-middlewares'

type Callback = express.RequestHandler | (() => void)

export type Middlewares = {
  [name: string]: (...args: unknown[]) => Callback
}

export type RouterSupport<M extends Middlewares = Middlewares> = {
  middlewares: M
}

export class NormalRouterSupport<M extends Middlewares = Middlewares> implements RouterSupport<M> {
  constructor(private _middlewares: M) {}

  get middlewares() {
    return this._middlewares
  }
}

export const nullRouterSupport: RouterSupport<Middlewares> = new NormalRouterSupport(nullMiddlewares)
