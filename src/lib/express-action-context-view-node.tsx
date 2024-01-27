import { ReactNode } from 'react'
import { StaticRouter } from 'react-router-dom/server.js'

import { RenderSupportContext } from './shared/render-support-context.js'
import { ExpressActionContext } from './express-action-context.js'
import { ServerRenderSupport } from './server-render-support.js'

export const createViewNode = (ctx: ExpressActionContext, rs: ServerRenderSupport, node: ReactNode) => {
  return (
    <StaticRouter location={ctx.req.originalUrl}>
      <RenderSupportContext.Provider value={rs}>{node}</RenderSupportContext.Provider>
    </StaticRouter>
  )
}
