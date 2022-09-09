import { NamedResources } from 'restrant2/client'
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

export type RenderSupport<RS extends NamedResources, SRS extends SuspendedNamedResources> = {
  getLocalizer: () => Localizer
  fetchJson: <T>(url: string, key?: string) => T
  resources: () => RS
  suspendedResources: () => SRS
  suspend: <T>(asyncProcess: () => Promise<T>, key: string) => T
  params: Readonly<ParamsDictionary>
  // TODO: query
  readonly isClient: boolean
  readonly isServer: boolean
  readonly invalidState: InvalidState | undefined
  invalidStateOrDefault: <T>(source: T) => InvalidStateOrDefaultProps<T>
}

export type PageProps<RS extends NamedResources, SRS extends SuspendedNamedResources> = { rs: RenderSupport<RS, SRS> }
export type PageNode<RS extends NamedResources, SRS extends SuspendedNamedResources> = React.FC<PageProps<RS, SRS>>

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

export function createSuspendedResourcesProxy<RS extends NamedResources, SRS extends SuspendedNamedResources>(
  rs: RenderSupport<RS, SRS>
) {
  const proxy: { [key: string]: { [methodName: string]: any } } = {}
  for (const [name, resource] of Object.entries(rs.resources())) {
    proxy[name] = {}
    for (const [methodName] of Object.entries(resource)) {
      proxy[name][methodName] = function (...args: any[]) {
        // rs.suspend(() => rs.resources().api_task.show(params), 'api_task_show'),
        console.log(`${name}/${methodName}`)
        return rs.suspend(() => rs.resources()[name][methodName](...args), `${name}_${methodName}`)
      }
    }
  }
  return proxy
}
