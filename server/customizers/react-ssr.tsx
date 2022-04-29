import { ActionContextCreator } from 'restrant2'
import { NodeArrangeFunc } from '../lib/react-ssr-engine'
import { actionContextFactory } from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'

export const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Layout>
      <Page {...options}></Page>
    </Layout>
  )
}

export const createActionContext: ActionContextCreator = (req, res, descriptor, httpPath) => {
  const ctxFactory = actionContextFactory(res.app.get('views') as string, arrange, '')
  return ctxFactory(req, res, descriptor, httpPath)
}
