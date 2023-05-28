import React from 'react'

import { StaticRouter } from 'react-router-dom/server'

import { ConstructViewFunc, ScriptProps, initBistrioReactView } from 'bistrio'

import { N2R } from '@bistrio/routes/all'
import { Layout } from './Layout'
import filemap from '@bistrio/filemap.json'

const { Wrapper } = initBistrioReactView<N2R>()

export const constructView: ConstructViewFunc = (Page, hydrate, options, ctx) => {
  // This is sample impl, changing js for any roles
  const script = ctx.query['admin'] == 'true' ? ['admin'] : ['main']

  const scriptProps: ScriptProps = { hydrate, script, filemap }
  return (
    <Wrapper ctx={ctx}>
      <Layout {...scriptProps}>
        <StaticRouter location={ctx.req.url}>
          <React.Suspense>
            <Page></Page>
          </React.Suspense>
        </StaticRouter>
      </Layout>
    </Wrapper>
  )
}
