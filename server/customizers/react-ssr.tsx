import { ActionContextCreator, ActionContextImpl } from 'restrant2'
import { NodeArrangeFunc } from '../lib/react-ssr-engine'
import { createRenderFunc } from '../lib/restrant2-react-render'
import { Layout } from '../../views/_layout'

export const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Layout>
      <Page {...options}></Page>
    </Layout>
  )
}

export const createActionContext: ActionContextCreator = (req, res, descriptor, httpPath) => {
  const ctx = new ActionContextImpl(req, res, descriptor, httpPath)
  const viewRoot = res.app.get('views') as string
  ctx.render = createRenderFunc(arrange, viewRoot, '')
  return ctx
}
