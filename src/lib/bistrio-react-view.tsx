import { createContext, ReactNode, useState } from 'react'
import { RenderSupport, NamedResources } from '..'
import { ServerRenderSupport } from './bistrio-react-render-support'
import { setRenderSupportContext } from './shared/render-support-context'

export type BistrioReactView<RS extends NamedResources> = {
  Wrapper: (props: { rs: RenderSupport<RS>; children?: ReactNode }) => JSX.Element
}

export const initBistrioReactView = <RS extends NamedResources>(): BistrioReactView<RS> => {
  const RenderSupportContext = createContext<RenderSupport<RS>>({} as ServerRenderSupport<RS>)
  setRenderSupportContext(RenderSupportContext)
  return {
    Wrapper: ({ rs, children }: { rs: RenderSupport<RS>; children?: ReactNode }) => {
      const [renderSupport] = useState(rs as ServerRenderSupport<RS>)
      return <RenderSupportContext.Provider value={renderSupport}>{children}</RenderSupportContext.Provider>
    },
  }
}
