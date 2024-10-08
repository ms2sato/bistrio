import { ActionOptions, NamedResources, Resource } from '../../client.js'
import { Localizer } from './locale.js'
import { readable, SuspendedReadable } from './suspense.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SuspendedResourceMethod = (input?: any, ...args: any[]) => any
export type SuspendedResource = Record<string, SuspendedResourceMethod>
export type SuspendedNamedResources = {
  [name: string]: SuspendedResource
}

export type ParamsDictionary = { [key: string]: string | undefined }
export type QueryDictionary = { [key: string]: undefined | string | string[] | QueryDictionary | QueryDictionary[] }

export type StubResources<RS extends NamedResources> = {
  [RN in keyof RS]: StubResource<RS[RN]>
}
export type StubResource<R> = AppendRMOArgument<OmitOptArgument<R>>

export type StubSuspendedResources<RS extends NamedResources> = {
  [RN in keyof RS]: StubSuspendedResource<RS[RN]>
}
export type StubSuspendedResource<R> = SuspendedAppendRMOArgument<OmitOptArgument<R>> & { $purge: () => void }

type RemoveLastArgIsA<F, A> = F extends (...args: infer Args) => infer R
  ? Args extends { length: 0 } // Argsが長さ0の場合
    ? F // 長さ0の場合はそのままの関数型を返す
    : Args extends [...infer Rest, A?] // Argsが長さ0でない場合
      ? (...args: Rest) => R // 最後の引数を除去した関数型を返す
      : F // 上記の条件に当てはまらない場合はそのままの関数型を返す
  : never

type AppendLastArgToResourceMethodOptions<F> = F extends (...args: infer Args) => infer R
  ? <SO, RO>(...args: [...Args, ResourceMethodOptions<SO, RO>?]) => R
  : never

type SuspendedAppendLastArgToResourceMethodOptions<F> = F extends (...args: infer Args) => infer R
  ? <SO, RO>(...args: [...Args, ResourceMethodOptions<SO, RO>?]) => Awaited<R>
  : never

type OmitOptArgument<R> = {
  [A in keyof R]: RemoveLastArgIsA<R[A], ActionOptions>
}

type AppendRMOArgument<R> = {
  [A in keyof R]: AppendLastArgToResourceMethodOptions<R[A]>
}

type SuspendedAppendRMOArgument<R> = {
  [A in keyof R]: SuspendedAppendLastArgToResourceMethodOptions<R[A]>
}

export type RenderSupport<RS extends NamedResources> = {
  getLocalizer: () => Localizer
  resources: () => StubResources<RS>
  suspendedResources: () => StubSuspendedResources<RS>
  readonly suspense: Suspendable
  suspend: <T>(asyncProcess: () => Promise<T>, key: string) => T
  params: Readonly<ParamsDictionary>
  readonly query: Readonly<QueryDictionary>
  readonly isClient: boolean
  readonly isServer: boolean
}

export type PageNode = React.FC

export type ReaderMap = { [key: string | symbol]: SuspendedReadable<unknown> }

export type SuspensePurgeOptions =
  | boolean
  | { startsWith: string }
  | { only: string | string[] }
  | { except: string | string[] }

export interface Suspendable {
  readonly readers: ReaderMap
  suspend<T>(asyncProcess: () => Promise<T>, key: string): T
  put(key: string | symbol, val: unknown): void
  remove(key: string | symbol): void
  read(key: string | symbol): unknown
  fetchJson<T>(url: string, key?: string): T
  purge(options?: SuspensePurgeOptions): void
}

export function isSuspensePurgeOptions(option: unknown): option is SuspensePurgeOptions {
  if (option === undefined || option === null) {
    return false
  }
  if (typeof option === 'boolean') {
    return true
  }
  if (typeof option === 'object') {
    if ('startsWith' in option && typeof option.startsWith === 'string') {
      return true
    }
    if ('only' in option && (typeof option.only === 'string' || Array.isArray(option.only))) {
      return true
    }
    if ('except' in option && (typeof option.except === 'string' || Array.isArray(option.except))) {
      return true
    }
  }
  return false
}

export class SuspenseImpl implements Suspendable {
  readonly readers: ReaderMap = {}
  suspend<T>(asyncProcess: () => Promise<T>, key: string | symbol): T {
    let reader: SuspendedReadable<unknown> | undefined = this.readers[key]
    if (!reader) {
      reader = readable(asyncProcess())
      this.readers[key] = reader
    }

    return (reader as SuspendedReadable<T>).read()
  }

  put(key: string | symbol, val: unknown) {
    this.readers[key] = readable(Promise.resolve(val))
  }

  remove(key: string | symbol) {
    delete this.readers[key]
  }

  read(key: string | symbol) {
    return this.readers[key]?.read()
  }

  fetchJson<T>(url: string, key: string = url): T {
    return this.suspend<T>(async () => {
      const ret = await fetch(url)
      return (await ret.json()) as T
    }, key)
  }

  purge(options?: SuspensePurgeOptions) {
    if (options === false) {
      return
    }

    if (options === undefined || options === true) {
      return Object.keys(this.readers).forEach((key) => delete this.readers[key])
    }

    if ('startsWith' in options) {
      for (const key of Object.keys(this.readers)) {
        if (key.startsWith(options.startsWith)) {
          delete this.readers[key]
        }
      }
      return
    }

    if ('only' in options) {
      const keys = typeof options.only === 'string' ? [options.only] : options.only
      for (const key of Object.keys(this.readers)) {
        if (keys.includes(key)) {
          delete this.readers[key]
        }
      }
    }

    if ('except' in options) {
      const keys = typeof options.except === 'string' ? [options.except] : options.except
      for (const key of Object.keys(this.readers)) {
        if (!keys.includes(key)) {
          delete this.readers[key]
        }
      }
    }
  }
}

export const suspense = (): Suspendable => {
  return new SuspenseImpl()
}

export class ResourceMethodOptions<SO = unknown, CO = RequestInit> {
  method_key?: string
  server?: {
    options: SO
  }
  client?: {
    options: CO
  }

  constructor({ method_key, server, client }: { method_key?: string; server?: SO; client?: CO }) {
    this.method_key = method_key
    this.server = server && { options: server }
    this.client = client && { options: client }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProxyResource = { [methodName: string]: any } & { $purge: () => void }

type ProxyResources = {
  [key: string]: ProxyResource
}

export function createSuspendedResourcesProxy<RS extends NamedResources>(rs: RenderSupport<RS>): ProxyResources {
  const proxy: ProxyResources = {}
  const namedResources = rs.resources()
  for (const [resourceName, resource] of Object.entries<Resource>(namedResources)) {
    proxy[resourceName] = {
      $purge() {
        rs.suspense.purge({ startsWith: `${resourceName}#` })
      },
    }

    for (const [methodName] of Object.entries(resource)) {
      // 1. no args
      // 2. input
      // 3. options
      // 4. input, options
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proxy[resourceName][methodName] = function (...args: any[]) {
        let methodArgs: unknown[]
        let methodKey = `${resourceName}#${methodName}?${JSON.stringify(args)}`
        if (args.length === 1) {
          if (args[0] instanceof ResourceMethodOptions) {
            methodArgs = [rs.isServer ? args[0].server?.options : args[0].client?.options]
            methodKey = args[0].method_key || methodKey
          } else {
            methodArgs = args
          }
        } else if (args.length === 2) {
          if (!(args[1] instanceof ResourceMethodOptions)) {
            throw new Error('ResourceMethod 2nd argument must be ResourceMethodOptions')
          }
          methodArgs = [args[0], rs.isServer ? args[1].server?.options : args[1].client?.options]
          methodKey = args[1].method_key || methodKey
        } else {
          methodArgs = args
        }

        const method = resource[methodName]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return rs.suspend(async () => await method(...methodArgs), methodKey)
      }
    }
  }
  return proxy
}
