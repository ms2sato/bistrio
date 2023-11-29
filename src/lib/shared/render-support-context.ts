import { createContext, useContext } from 'react'
import { NamedResources } from '../../index.js'
import { RenderSupport } from './index.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RenderSupportContext: React.Context<RenderSupport<any>> = createContext<RenderSupport<any>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  {} as RenderSupport<any>,
)

export const useRenderSupport = <RS extends NamedResources>() => {
  return useContext<RenderSupport<RS>>(RenderSupportContext as React.Context<RenderSupport<RS>>)
}
