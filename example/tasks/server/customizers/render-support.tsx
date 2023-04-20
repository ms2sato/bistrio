import React from 'react'

import { StaticRouter } from 'react-router-dom/server'

import { ConstructViewFunc, initBistrioReactView } from 'bistrio'

import { N2R } from '@bistrio/routes/all'
import { Layout } from './Layout'
import versions from '@bistrio/versions.json'

const { Wrapper } = initBistrioReactView<N2R>()

export const constructView: ConstructViewFunc = (Page, hydrate, options, ctx) => {
  // This is sample impl, changing js for any roles
  const script = ctx.query['admin'] == 'true' ? ['admin'] : ['main']
  const props = { hydrate, script, versions }
  return (
    <Wrapper ctx={ctx}>
      <Layout props={props}>
        <StaticRouter location={ctx.req.url}>
          <React.Suspense>
            <Page></Page>
          </React.Suspense>
        </StaticRouter>
      </Layout>
    </Wrapper>
  )
}
