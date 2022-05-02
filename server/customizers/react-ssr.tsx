import { Application } from 'express'
import { ActionContextCreator } from 'restrant2'
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

const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Wrapper>
      <Page {...options}></Page>
    </Wrapper>
  )
}

const Wrapper = ({ children }: { children: ReactNode }) => {
  const [ctx] = useState(createRenderSupport())

  return (
    <Layout>
      <RenderSupportContext.Provider value={ctx}>{children}</RenderSupportContext.Provider>
    </Layout>
  )
}

let ctxCreator: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  app.engine('tsx', engine(arrange))
  app.set('views', viewRoot)
  app.set('view engine', 'tsx')

  ctxCreator = buildActionContextCreator(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return ctxCreator(props)
}
