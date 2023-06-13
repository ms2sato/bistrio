import { NamedResources, opt, Resource, ResourceMethod } from '../../client'
import { Localizer } from '../shared/locale'

export type SuspendedResourceMethod = (input?: any, ...args: any[]) => any
export type SuspendedResource = Record<string, SuspendedResourceMethod>
export type SuspendedNamedResources = {
  [name: string]: SuspendedResource
}

export type SuspendedReader<T> = {
  read(): T
  readonly error?: unknown
  readonly result?: T
  readonly suspender: Promise<unknown>
}

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
export function suspendable<T>(promise: Promise<T>): SuspendedReader<T> {
  let _result: T | undefined
  let _error: unknown
  const suspender: Promise<void> = promise.then(
    (ret) => {
      if (ret === undefined) {
        throw new Error('suspendable: promise resolved with undefined')
      }
      _result = ret
    },
    (err: unknown) => {
      _error = err
    }
  )
  return {
    read: () => {
      if (_result) return _result
      if (_error) throw _error
      throw suspender
    },
    get result() { return _result },
    get error() { return _error},
    suspender,
  }
}

export type ParamsDictionary = { [key: string]: string | undefined }

export type StubMethodParams<P> = {
  [K in keyof P]: P[K] extends opt<unknown> ? ResourceMethodOptions : P[K]
}

export type StubMethodArguments<T extends ResourceMethod> = T extends (...args: infer P) => any
  ? StubMethodParams<P>
  : never

export type StubResource<R extends Resource> = {
  [MN in keyof R]: (...args: StubMethodArguments<R[MN]>) => ReturnType<R[MN]>
}

export type StubResources<RS extends NamedResources> = {
  [RN in keyof RS]: StubResource<RS[RN]>
}

export type StubSuspendedResource<R extends Resource> = {
  [MN in keyof R]: (...args: StubMethodArguments<R[MN]>) => Awaited<ReturnType<R[MN]>>
} & { $purge: () => void }

export type StubSuspendedResources<RS extends NamedResources> = {
  [RN in keyof RS]: StubSuspendedResource<RS[RN]>
}

export type RenderSupport<RS extends NamedResources> = {
  getLocalizer: () => Localizer
  resources: () => StubResources<RS>
  suspendedResources: () => StubSuspendedResources<RS>
  readonly suspense: Suspense
  suspend: <T>(asyncProcess: () => Promise<T>, key: string) => T
  params: Readonly<ParamsDictionary>
  // TODO: query
  readonly isClient: boolean
  readonly isServer: boolean
}

export type PageNode = React.FC

export type ReaderMap = { [key: string]: SuspendedReader<unknown> }

export type SuspensePurgeOptions = { startsWith: string } | { only: string | string[] } | { except: string | string[] }

export class Suspense {
  readonly readers: ReaderMap = {}
  suspend<T>(asyncProcess: () => Promise<T>, key: string): T {
    let reader: SuspendedReader<unknown> | undefined = this.readers[key]
    if (!reader) {
      reader = suspendable(asyncProcess())
      this.readers[key] = reader
    }

    return (reader as SuspendedReader<T>).read()
  }

  fetchJson<T>(url: string, key: string = url): T {
    return this.suspend<T>(async () => {
      const ret = await fetch(url)
      return (await ret.json()) as T
    }, key)
  }

  purge(options?: SuspensePurgeOptions) {
    if (!options) {
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

export const suspense = (): Suspense => {
  return new Suspense()
}

export class ResourceMethodOptions<SO = unknown, CO = RequestInit> {
  method_key?: string
  server?: {
    options: SO
  }
  client?: {
    options: CO
  }
}

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
