import { StaticRouter } from 'react-router-dom/server'
import { ConstructViewFunc, RenderSupportContext, ScriptProps, toRoutes } from 'bistrio'
import { Layout } from './Layout'
import { RoutesWrapper } from '@/isomorphic/components/RoutesWrapper'


export const constructView: ConstructViewFunc = ({ node: _Page, hydrate, ctx, rs }) => {
  // This is sample impl, changing js for any roles
  const script = ctx.query['admin'] == 'true' ? ['admin'] : ['main']

  const scriptProps: ScriptProps = { hydrate, script }

  return (
    <Layout {...scriptProps}>
      <RenderSupportContext.Provider value={rs}>
        <RoutesWrapper>
          <StaticRouter location={ctx.req.url}>
            {toRoutes(ctx.getCore().routeObject)}
          </StaticRouter>
        </RoutesWrapper>
      </RenderSupportContext.Provider>
    </Layout>
  )
}
