import { Application } from 'express'
import { ActionContextCreator } from 'restrant2'
import { actionContextCreatorFactory, NodeArrangeFunc, engine } from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'

const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Layout>
      <Page {...options}></Page>
    </Layout>
  )
}

let ctxCreator: ActionContextCreator

export const useTsxView = (app: Application, viewRoot: string) => {
  app.engine('tsx', engine(arrange))
  app.set('views', viewRoot)
  app.set('view engine', 'tsx')

  ctxCreator = actionContextCreatorFactory(viewRoot, arrange, '')
}

export const createActionContext: ActionContextCreator = (props) => {
  return ctxCreator(props)
}
