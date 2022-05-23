import { Localizer } from './locale'
import { Resource } from 'restrant2/client'
import { ResourceFunc, ResourceMethod } from 'restrant2'

export type Reader<T> = () => T

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
export function suspendable<T>(promise: Promise<T>): Reader<T> {
  let result: T
  let err: Error
  const suspender = promise.then(
    (ret) => (result = ret),
    (e: Error) => (err = e)
  )
  return () => {
    if (result) return result
    if (err) throw err
    throw suspender
  }
}

export type RenderSupport = {
  getLocalizer: () => Localizer
  fetchJson: <T>(url: string, key?: string) => T
  resourceOf: <T extends Resource>(name: string) => T
  suspend: <T>(asyncProcess: () => Promise<T>, key: string) => T
}

export type PageProps = { rs: RenderSupport }
export type PageNode = React.FC<PageProps>

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
      return suspend(async () => {
        const ret = await fetch(url)
        return await ret.json()
      }, key)
    },
  }
}

export type ResourceOf<R extends ResourceFunc> = ReturnType<R>

export const getResource = <RF extends ResourceFunc>(rs: RenderSupport, name: string): SuspendableResource<RF> => {
  const res = rs.resourceOf<ResourceOf<RF>>(name)
  const proxy: Record<string, ResourceMethod> = {}
  for (const action in res) {
    proxy[action] = function (...args: unknown[]) {
      return rs.suspend(() => res[action].apply(res, args), `${name}#${action}`)
    }
  }
  return proxy as unknown as SuspendableResource<RF>
}

type SuspendableResource<RF extends ResourceFunc> = {
  [key in keyof ResourceOf<RF>]: (...args: Parameters<ResourceOf<RF>[key]>) => Awaited<ReturnType<ResourceOf<RF>[key]>>
}
