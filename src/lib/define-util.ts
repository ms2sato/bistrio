import {
  ActionSupport,
  RequestCallback,
  Resource,
  ResourceFunc,
  ResourceSupport,
  Responder,
  RouteConfig,
  Handler,
} from '..'

export function defineResource<R extends Resource>(callback: (support: ResourceSupport, config: RouteConfig) => R) {
  return callback
}

export function defineAdapter<AR>(callback: (support: ActionSupport, config: RouteConfig) => AR) {
  return callback
}

export type AdapterOf<R extends ResourceFunc, Opt = undefined> = {
  [actionName in keyof ReturnType<R>]:
    | Handler
    | Responder<Opt, Awaited<ReturnType<ReturnType<R>[actionName]>>, Partial<Parameters<ReturnType<R>[actionName]>[0]>>
    | RequestCallback<Parameters<ReturnType<R>[actionName]>[0]>
}
