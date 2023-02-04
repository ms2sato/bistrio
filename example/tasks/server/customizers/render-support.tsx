import React from 'react'
import { StaticRouter } from 'react-router-dom/server'
import { Application } from 'express'
import { ActionContextCreator } from 'restrant2'
import { buildActionContextCreator, ConstructViewFunc, initBistrioReactView } from 'bistrio'
import { Layout } from '../../isomorphic/views/_layout'
import { N2R } from '@bistrio/routes/all'

const { Wrapper } = initBistrioReactView<N2R>()

const constructView: ConstructViewFunc = (Page, hydrate, options, ctx) => {
  const props = { hydrate }
  return (
    <Wrapper ctx={ctx}>
      <Layout props={props}>
        <StaticRouter location={ctx.req.url}>
          <Page></Page>
        </StaticRouter>
      </Layout>
    </Wrapper>
  )
}

let createActionCtx: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  createActionCtx = buildActionContextCreator(viewRoot, constructView, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return createActionCtx(props)
}
