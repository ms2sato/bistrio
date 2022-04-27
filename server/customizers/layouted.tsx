import { NodeArrangeFunc } from '../lib/jsx-engine'
import { Layout } from '../../pages/_layout'

export const arrange: NodeArrangeFunc = (Page, options) => {
  return (
    <Layout>
      <Page {...options}></Page>
    </Layout>
  )
}
