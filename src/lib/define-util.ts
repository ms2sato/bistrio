import {
  ActionSupport,
  RequestCallback,
  ResourceFunc,
  ResourceSupport,
  Responder,
  ResourceRouteConfig,
  Handler,
} from '../index.js'

export function defineResource<R>(
  callback: (support: ResourceSupport, config: ResourceRouteConfig) => R,
) {
  return callback
}

export function defineAdapter<AR>(callback: (support: ActionSupport, config: ResourceRouteConfig) => AR) {
  return callback
}

export type AdapterOf<R extends ResourceFunc, Opt = undefined> = {
  [actionName in keyof ReturnType<R>]:
    | Handler
    | Responder<Opt, Awaited<ReturnType<ReturnType<R>[actionName]>>, Partial<Parameters<ReturnType<R>[actionName]>[0]>>
    | RequestCallback<Parameters<ReturnType<R>[actionName]>[0]>
}
