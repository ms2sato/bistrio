import {
  ActionSupport,
  RequestCallback,
  ResourceFunc,
  ResourceSupport,
  Responder,
  ResourceRouteConfig,
  Handler,
} from '../index.js'

export type DefineResourceCallback<R> = (support: ResourceSupport, config: ResourceRouteConfig) => R
export const defineResource = <R>(callback: DefineResourceCallback<R>): DefineResourceCallback<R> => callback

export type DefineAdapterCallback<AR> = (support: ActionSupport, config: ResourceRouteConfig) => Partial<AR>
export const defineAdapter = <AR>(callback: DefineAdapterCallback<AR>): DefineAdapterCallback<AR> => callback

export type AdapterOf<R extends ResourceFunc, Opt = undefined> = {
  [actionName in keyof ReturnType<R>]:
    | Handler
    | Responder<Opt, Awaited<ReturnType<ReturnType<R>[actionName]>>, Partial<Parameters<ReturnType<R>[actionName]>[0]>>
    | RequestCallback<Parameters<ReturnType<R>[actionName]>[0]>
}
