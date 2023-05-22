import { createContext, ReactNode, useState } from 'react'
import { RenderSupport, ActionContext, NamedResources } from '..'
import { createRenderSupport, ServerRenderSupport } from './bistrio-react-render-support'
import { setRenderSupportContext } from './shared/render-support-context'

export type BistrioReactView = {
  Wrapper: ({ ctx, children }: { ctx: ActionContext; children?: ReactNode }) => JSX.Element
}

export const initBistrioReactView = <RS extends NamedResources>():BistrioReactView => {
  const RenderSupportContext = createContext<RenderSupport<RS>>({} as ServerRenderSupport<RS>)
  setRenderSupportContext(RenderSupportContext)
  const RenderSupportProvider = RenderSupportContext.Provider

  return {
    Wrapper: ({ ctx, children }: { ctx: ActionContext; children?: ReactNode }) => {
      const [renderSupport] = useState(createRenderSupport<RS>(ctx))
      const staticProps = renderSupport.getStaticProps()

      return (
        <>
          <RenderSupportProvider value={renderSupport}>{children}</RenderSupportProvider>
          <script type="application/static-props.bistrio+json">{JSON.stringify(staticProps)}</script>
        </>
      )
    }
  }
}
