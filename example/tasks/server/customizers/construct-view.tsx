import { StaticRouter } from 'react-router-dom/server'
import { ConstructViewFunc, RenderSupportContext, ScriptProps } from 'bistrio'
import { Layout } from './Layout'
import { RoutesWrapper } from '@/isomorphic/components/RoutesWrapper'
import { Routes, Route } from 'react-router-dom'

export const constructView: ConstructViewFunc = ({ node: Page, hydrate, ctx, rs }) => {
  // This is sample impl, changing js for any roles
  const script = ctx.query['admin'] == 'true' ? ['admin'] : ['main']

  const scriptProps: ScriptProps = { hydrate, script }

  return (
    <Layout {...scriptProps}>
      <RenderSupportContext.Provider value={rs}>
        <RoutesWrapper>
          <StaticRouter location={ctx.req.url}>
            <Routes>
              <Route path={ctx.routePath} element={<Page />} />
            </Routes>
          </StaticRouter>
        </RoutesWrapper>
      </RenderSupportContext.Provider>
    </Layout>
  )
}
