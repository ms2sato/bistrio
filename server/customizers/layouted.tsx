import { NodeArrangeFunc } from '../lib/jsx-engine'
import { Layout } from '../../views/_layout'

export const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Layout>
      <Page {...options}></Page>
    </Layout>
  )
}
