import { useEffect, useState } from 'react'

type UseCSRCallback<T> = () => T | undefined

/**
 * useCSR is a hook that will only run on CSR, not on SSR.
 * @param callback - A callback function that will only run on CSR.
 *
 * @example
 * const [isCSR] = useCSR() // will returns [true] on CSR, fix returns [undefined] on SSR
 * const [component] = useCSR(() => <MyComponent />) // will returns [(MyComponent's instance)] on CSR, [undefined] on SSR
 */
function useCSR<T = React.ReactNode>(callback: UseCSRCallback<T>): [T | undefined]
function useCSR(): [boolean]
function useCSR<T = React.ReactNode>(callback?: UseCSRCallback<T>): [true | undefined] | [T | undefined] {
  const [effected, setEffected] = useState<true>()

  // effects calls on client side only
  useEffect(() => {
    setEffected(true)
  }, [])

  if (callback) {
    return [effected ? callback() : undefined]
  } else {
    return [effected]
  }
}

export { useCSR }
