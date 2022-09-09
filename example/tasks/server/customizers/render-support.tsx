import { ReactNode, useState } from 'react'
import { StaticRouter } from 'react-router-dom/server'
import { Application } from 'express'
import { ActionContextCreator, ActionContext } from 'restrant2'
import { PageNode, buildActionContextCreator, NodeArrangeFunc, createRenderSupport } from 'bistrio'
import { Layout } from '@/views/_layout'
import { N2R, N2SR } from '@bistrio/routes/all/_types'

const arrange: NodeArrangeFunc<N2R, N2SR> = (Page, hydrate, options, ctx) => {
  return <Wrapper ctx={ctx} Page={Page} hydrate={hydrate}></Wrapper>
}

const Wrapper = ({
  Page,
  ctx,
  hydrate,
}: {
  ctx: ActionContext
  Page: PageNode<N2R, N2SR>
  hydrate: boolean
  children?: ReactNode
}) => {
  const [renderSupport] = useState(createRenderSupport<N2R, N2SR>(ctx))
  const staticProps = renderSupport.getStaticProps()
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
  createActionCtx = buildActionContextCreator<N2R, N2SR>(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return createActionCtx(props)
}
