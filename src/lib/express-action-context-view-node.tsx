import { ReactNode } from 'react'
import { StaticRouter } from 'react-router-dom/server'

import { RenderSupportContext } from './shared/render-support-context'
import { ExpressActionContext } from './express-action-context'
import { ServerRenderSupport } from './server-render-support'

export const createViewNode = (ctx: ExpressActionContext, rs: ServerRenderSupport, node: ReactNode) => {
  return (
    <StaticRouter location={ctx.req.originalUrl}>
      <RenderSupportContext.Provider value={rs}>{node}</RenderSupportContext.Provider>
    </StaticRouter>
  )
}
