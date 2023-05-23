import { useContext } from 'react'
import { NamedResources } from '../..'
import { RenderSupport } from './'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RSC: React.Context<RenderSupport<any>>

export const setRenderSupportContext = <RS extends NamedResources>(rsc: React.Context<RenderSupport<RS>>) => {
  RSC = rsc
}

export const useRenderSupport = <RS extends NamedResources>() => {
  return useContext<RenderSupport<RS>>(RSC as React.Context<RenderSupport<RS>>)
}
