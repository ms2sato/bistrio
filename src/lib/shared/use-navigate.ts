import { NavigateOptions as NaviOptions, useNavigate as useNavi, To } from 'react-router-dom'
import { useRenderSupport } from '.'

export type NavigateOptions = {
  purge: boolean
}

export type NavigateFunc = {
  (to: To, options?: NavigateOptions, navigateOptions?: NaviOptions): void
  (delta: number, options?: NavigateOptions): void
}

export function useNavigate(): NavigateFunc {
  const rs = useRenderSupport()
  const navi = useNavi()

  return function navigate(to: To | number, options?: NavigateOptions, navigateOptions: NaviOptions = {}) {
    if (options) {
      if (options.purge === true) {
        rs.suspense.purge()
      }
    }

    if (typeof to === 'number') {
      navi(to)
      return
    }

    navi(to, navigateOptions)
  }
}
