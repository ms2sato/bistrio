import React from 'react'

import { StaticRouter } from 'react-router-dom/server'
import { ConstructViewFunc, RenderSupportContext, ScriptProps } from 'bistrio'
import { Layout } from './Layout'

export const constructView: ConstructViewFunc = ({ node: Page, hydrate, ctx, rs }) => {
  // This is sample impl, changing js for any roles
  const script = ctx.query['admin'] == 'true' ? ['admin'] : ['main']

  const scriptProps: ScriptProps = { hydrate, script }

  return (
    <RenderSupportContext.Provider value={rs}>
      <Layout {...scriptProps}>
        <StaticRouter location={ctx.req.url}>
          <React.Suspense>
            <Page></Page>
          </React.Suspense>
        </StaticRouter>
      </Layout>
    </RenderSupportContext.Provider>
  )
}
