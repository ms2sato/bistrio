import { Application } from 'express'
import { ActionContextCreator, ActionContext } from 'restrant2'
import { buildActionContextCreator, NodeArrangeFunc, createRenderSupport } from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'
import { ReactNode, useState } from 'react'
import { StaticRouter } from 'react-router-dom/server'
import { PageNode } from '../../lib/render-support'
import { N2R } from '../../_types'


const arrange: NodeArrangeFunc<N2R> = (Page, options, ctx) => {
  return <Wrapper ctx={ctx} Page={Page}></Wrapper>
}

const Wrapper = ({ Page, ctx }: { ctx: ActionContext; Page: PageNode<N2R>; children?: ReactNode }) => {
  const [renderSupport] = useState(createRenderSupport<N2R>(ctx))

  return (
    <Layout>
      <StaticRouter location={ctx.req.url}>
        <Page rs={renderSupport}></Page>
      </StaticRouter>
    </Layout>
  )
}

let createActionCtx: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  createActionCtx = buildActionContextCreator<N2R>(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return createActionCtx(props)
}
