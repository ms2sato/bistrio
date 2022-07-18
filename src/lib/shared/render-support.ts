import { NamedResources } from 'restrant2/client'
import { Localizer } from '../shared/locale'
import { InvalidProps } from './static-props'

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

export type ParamsDictionary = { [key: string]: string | undefined }

export type RenderSupport<RS extends NamedResources> = {
  getLocalizer: () => Localizer
  fetchJson: <T>(url: string, key?: string) => T
  resources: () => RS
  suspend: <T>(asyncProcess: () => Promise<T>, key: string) => T
  params: Readonly<ParamsDictionary>
  // TODO: query
  readonly isClient: boolean
  readonly isServer: boolean
  readonly invalid: InvalidProps | undefined
}

export type PageProps<RS extends NamedResources> = { rs: RenderSupport<RS> }
export type PageNode<RS extends NamedResources> = React.FC<PageProps<RS>>

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

//export type ResourceOf<R extends ResourceFunc> = ReturnType<R>

// type SuspendableResource<RF extends ResourceFunc> = {
//   [key in keyof ResourceOf<RF>]: (...args: Parameters<ResourceOf<RF>[key]>) => Awaited<ReturnType<ResourceOf<RF>[key]>>
// }
