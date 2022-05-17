import {Localizer} from './locale'

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
}

export type CreateRenderSupportFunc = (option?: unknown) => RenderSupport

export type PageProps = { rs: RenderSupport }
