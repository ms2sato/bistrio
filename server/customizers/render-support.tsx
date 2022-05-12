import { Application } from 'express'
import { ActionContextCreator, ActionContext } from 'restrant2'
import {
  buildActionContextCreator,
  NodeArrangeFunc,
  engine,
  RenderSupport,
  createRenderSupport,
} from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'
import { createContext, ReactNode, useState } from 'react'

export const RenderSupportContext = createContext<RenderSupport>(createRenderSupport())

const arrange: NodeArrangeFunc = (Page, options, ctx) => {
  return (
    <Wrapper ctx={ctx}>
      <Page {...options}></Page>
    </Wrapper>
  )
}

const Wrapper = ({ children, ctx }: { ctx: ActionContext, children: ReactNode }) => {
  const [renderSupportContext] = useState(createRenderSupport(ctx))

  return (
    <Layout>
      <RenderSupportContext.Provider value={renderSupportContext}>{children}</RenderSupportContext.Provider>
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
