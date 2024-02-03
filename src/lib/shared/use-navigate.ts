import { NavigateOptions as NaviOptions, useNavigate as useReactRouterNavi, To } from 'react-router-dom'
import {
  useRenderSupport,
  NavigateFlashMessageOptions,
  isNavigateFlashMessageOptions,
  SuspensePurgeOptions,
  isSuspensePurgeOptions,
} from './index.js'

export type PurgeOption = {
  purge: SuspensePurgeOptions
}

export const isPurgeOption = (option: unknown): option is PurgeOption => {
  if (!option) {
    return false
  }
  const typedOption = option as PurgeOption
  return 'purge' in typedOption && isSuspensePurgeOptions(typedOption.purge)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NavigateOptions = PurgeOption | NavigateFlashMessageOptions<any>

export type NavigateFunc = {
  (to: To, options?: NavigateOptions, navigateOptions?: NaviOptions): void
  (delta: number, options?: NavigateOptions): void
}

export const navigateOptionsKey = '__bistrio_navigate_options__'

export function useNavigate(): NavigateFunc {
  const rs = useRenderSupport()
  const navi = useReactRouterNavi()

  return function navigate(to: To | number, options?: NavigateOptions, navigateOptions: NaviOptions = {}) {
    if (options) {
      let storeOptions = options

      if (isPurgeOption(options)) {
        rs.suspense.purge(options.purge)
      }
      if (isNavigateFlashMessageOptions(options)) {
        storeOptions = {
          ...options,
          flashMessage: { ...options.flashMessage, to },
        }

        rs.suspense.put(navigateOptionsKey, storeOptions)
      }
    }

    if (typeof to === 'number') {
      navi(to)
      return
    }

    navi(to, navigateOptions)
  }
}
