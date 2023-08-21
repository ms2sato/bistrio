import { NavigateOptions as NaviOptions, useNavigate as useNavi, To } from 'react-router-dom'
import {
  useRenderSupport,
  FlashMessageState,
  isFlashMessageState,
  SuspensePurgeOptions,
  isSuspensePurgeOptions,
} from '.'

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
export type NavigateOptions = PurgeOption | FlashMessageState<any>

export type NavigateFunc = {
  (to: To, options?: NavigateOptions, navigateOptions?: NaviOptions): void
  (delta: number, options?: NavigateOptions): void
}

export function useNavigate(): NavigateFunc {
  const rs = useRenderSupport()
  const navi = useNavi()

  return function navigate(to: To | number, options?: NavigateOptions, navigateOptions: NaviOptions = {}) {
    if (options) {
      if (isPurgeOption(options)) {
        rs.suspense.purge(options.purge)
      }
      if (isFlashMessageState(options)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        navigateOptions.state = { ...options, ...navigateOptions.state }
      }
    }

    if (typeof to === 'number') {
      navi(to)
      return
    }

    navi(to, navigateOptions)
  }
}
