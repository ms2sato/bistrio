type Wakeable = PromiseLike<unknown>
type Thenable<T> = PromiseLike<T>

const Uninitialized = -1
const Pending = 0
const Resolved = 1
const Rejected = 2

let _versionNo = 1
export const purge = () => {
  _versionNo++
  console.log('purge', _versionNo)
}

type UninitializedPayload<T> = {
  _status: typeof Uninitialized
  _result: () => Thenable<{ default: T }>
  _ctor: () => Thenable<{ default: T }>
  _versionNo: number
}

type PendingPayload = {
  _status: typeof Pending
  _result: Wakeable
  _versionNo: number
}

type ResolvedPayload<T> = {
  _status: typeof Resolved
  _result: { default: T }
  _versionNo: number
}

type RejectedPayload = {
  _status: typeof Rejected
  _result: unknown
  _versionNo: number
}

type Payload<T> = UninitializedPayload<T> | PendingPayload | ResolvedPayload<T> | RejectedPayload

export type LazyComponent<T> = {
  $$typeof: symbol | number
  _payload: Payload<T>
  _init: (payload: Payload<T>) => T
}

function lazyInitializer<T>(payload: Payload<T>): T {
  console.log('lazyInitializer', payload, _versionNo)
  if (payload._versionNo !== _versionNo) {
    console.log('version mismatch', payload._versionNo, _versionNo)

    const uninitialized = payload as unknown as UninitializedPayload<T>
    uninitialized._versionNo = _versionNo
    uninitialized._status = Uninitialized
    uninitialized._result = uninitialized._ctor

    console.log('re-initialize', uninitialized)
  }

  if (payload._status === Uninitialized) {
    const ctor = payload._result
    const thenable = ctor()
    thenable.then(
      (moduleObject) => {
        if ((payload as Payload<T>)._status === Pending || payload._status === Uninitialized) {
          const resolved = payload as unknown as ResolvedPayload<T>
          resolved._status = Resolved
          resolved._result = moduleObject
        }
      },
      (error) => {
        if ((payload as Payload<T>)._status === Pending || payload._status === Uninitialized) {
          const rejected = payload as unknown as RejectedPayload
          rejected._status = Rejected
          rejected._result = error
        }
      },
    )
    if (payload._status === Uninitialized) {
      const pending = payload as unknown as PendingPayload
      pending._status = Pending
      pending._result = thenable
    }
  }
  if (payload._status === Resolved) {
    const moduleObject = payload._result
    return moduleObject.default
  } else {
    throw payload._result
  }
}

export function lazy<T>(ctor: () => Thenable<{ default: T }>): LazyComponent<T> {
  const payload: Payload<T> = {
    _status: Uninitialized,
    _result: ctor,
    _ctor: ctor,
    _versionNo,
  }

  const lazyType: LazyComponent<T> = {
    $$typeof: Symbol.for('react.lazy'),
    _payload: payload,
    _init: lazyInitializer,
  }

  return lazyType
}
