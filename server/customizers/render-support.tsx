import { Application } from 'express'
import { ActionContextCreator, ActionContext } from 'restrant2'
import {
  buildActionContextCreator,
  NodeArrangeFunc,
  engine,
  createRenderSupport,
  PageNode,
} from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'
import { ReactNode, useState } from 'react'

const arrange: NodeArrangeFunc = async (Page, options, ctx) => {
  return <Wrapper ctx={ctx} Page={Page}></Wrapper>
}

const Wrapper = ({ Page, ctx }: { ctx: ActionContext; Page: PageNode; children?: ReactNode }) => {
  const [renderSupport] = useState(createRenderSupport(ctx))

  return (
    <Layout>
      <Page rs={renderSupport}></Page>
    </Layout>
  )
}

let createActionCtx: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  app.engine('tsx', engine(arrange))
  app.set('views', viewRoot)
  app.set('view engine', 'tsx')

  createActionCtx = buildActionContextCreator(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return createActionCtx(props)
}
