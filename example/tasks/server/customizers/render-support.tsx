import { ReactNode, useState } from 'react'
import { StaticRouter } from 'react-router-dom/server'
import { Application } from 'express'
import { ActionContextCreator, ActionContext } from 'restrant2'
import { PageNode, buildActionContextCreator, NodeArrangeFunc, createRenderSupport } from 'bistrio'
import { Layout } from '@/views/_layout'
import { N2R } from '@bistrio/routes/all/_types'

const arrange: NodeArrangeFunc<N2R> = (Page, hydrate, options, ctx) => {
  return <Wrapper ctx={ctx} Page={Page} hydrate={hydrate}></Wrapper>
}

const Wrapper = ({
  Page,
  ctx,
  hydrate,
}: {
  ctx: ActionContext
  Page: PageNode<N2R>
  hydrate: boolean
  children?: ReactNode
}) => {
  const [renderSupport] = useState(createRenderSupport<N2R>(ctx))
  const staticProps = ctx.req.session.bistrio
  const props = { hydrate }

  return (
    <>
      <Layout props={props}>
        <StaticRouter location={ctx.req.url}>
          <Page rs={renderSupport}></Page>
        </StaticRouter>
      </Layout>
      <script type="application/static-props.bistrio+json">{JSON.stringify(staticProps)}</script>
    </>
  )
}

let createActionCtx: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  createActionCtx = buildActionContextCreator<N2R>(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return createActionCtx(props)
}
