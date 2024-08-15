export type SuspendedReadable<T> = {
  read(): T
  readonly error?: unknown
  readonly result?: T
  readonly status: SuspendedStatus
  readonly suspender: Promise<unknown>
}

export const suspendedSuccess = 0
export const suspendedError = 1
export const suspendedPending = 2

export type SuspendedStatus = typeof suspendedSuccess | typeof suspendedError | typeof suspendedPending

// @see https://blog.logrocket.com/react-suspense-data-fetching/#data-fetching-approaches
export function readable<T>(promise: Promise<T>): SuspendedReadable<T> {
  let _status: SuspendedStatus = suspendedPending
  let _result: T
  let _error: unknown
  const suspender: Promise<void> = promise.then(
    (ret) => {
      _status = suspendedSuccess
      _result = ret
    },
    (err: unknown) => {
      _status = suspendedError
      _error = err
    },
  )
  return {
    read: () => {
      if (_status === suspendedSuccess) return _result
      if (_status === suspendedError) throw _error
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw suspender
    },
    get result() {
      return _result
    },
    get error() {
      return _error
    },
    get status() {
      return _status
    },
    suspender,
  }
}
