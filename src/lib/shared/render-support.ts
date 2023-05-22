import { NamedResources, opt, Resource, ResourceMethod } from '../../client'
import { Localizer } from '../shared/locale'
import { InvalidStateOrDefaultProps, InvalidState } from './static-props'

export type SuspendedResourceMethod = (input?: any, ...args: any[]) => any
export type SuspendedResource = Record<string, SuspendedResourceMethod>
export type SuspendedNamedResources = {
  [name: string]: SuspendedResource
}

export type Reader<T> = () => T

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
export function suspendable<T>(promise: Promise<T>): Reader<T> {
  let result: T
  let err: Error
  const suspender = promise.then(
    (ret) => {
      if (ret === undefined) {
        throw new Error('suspendable: promise resolved with undefined')
      }
      result = ret
    },
    (e: Error) => (err = e)
  )
  return () => {
    if (result) return result
    if (err) throw err
    throw suspender
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
}

export type StubSuspendedResources<RS extends NamedResources> = {
  [RN in keyof RS]: StubSuspendedResource<RS[RN]>
}

export type RenderSupport<RS extends NamedResources> = {
  getLocalizer: () => Localizer
  fetchJson: <T>(url: string, key?: string) => T
  resources: () => StubResources<RS>
  suspendedResources: () => StubSuspendedResources<RS>
  suspend: <T>(asyncProcess: () => Promise<T>, key: string) => T
  params: Readonly<ParamsDictionary>
  // TODO: query
  readonly isClient: boolean
  readonly isServer: boolean
  readonly invalidState: InvalidState | undefined
  invalidStateOr: <T>(source: T | (() => T)) => InvalidStateOrDefaultProps<T>
}

export type PageNode = React.FC

type ReaderMap = Map<string, Reader<unknown>>

export const suspense = () => {
  const readerMap: ReaderMap = new Map()

  const suspend = <T>(asyncProcess: () => Promise<T>, key: string): T => {
    let reader: Reader<unknown> | undefined = readerMap.get(key)
    if (!reader) {
      reader = suspendable(asyncProcess())
      readerMap.set(key, reader)
    }

    return (reader as Reader<T>)()
  }

  return {
    suspend,
    fetchJson<T>(url: string, key: string = url): T {
      return suspend<T>(async () => {
        const ret = await fetch(url)
        return (await ret.json()) as T
      }, key)
    },
  }
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

export function createSuspendedResourcesProxy<RS extends NamedResources>(rs: RenderSupport<RS>) {
  const proxy: { [key: string]: { [methodName: string]: any } } = {}
  const namedResources = rs.resources()
  for (const [resourceName, resource] of Object.entries<Resource>(namedResources)) {
    proxy[resourceName] = {}
    for (const [methodName] of Object.entries(resource)) {
      // 1. no args
      // 2. input
      // 3. options
      // 4. input, options
      proxy[resourceName][methodName] = function (...args: any[]) {
        let methodArgs: unknown[]
        let methodKey = `${resourceName}_${methodName}`
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

        console.log(`${resourceName}/${methodName}`)
        const method = resource[methodName]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return rs.suspend(async () => await method(...methodArgs), methodKey)
      }
    }
  }
  return proxy
}
