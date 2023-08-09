import { ConstructViewFunc } from 'bistrio'
import { Layout } from './Layout'
import { RoutesWrapper } from '@/isomorphic/components/RoutesWrapper'

export const constructView: ConstructViewFunc = ({ routes, hydrate, ctx }) => {
  return (
    <Layout hydrate={hydrate} ctx={ctx}>
      <RoutesWrapper>{routes}</RoutesWrapper>
    </Layout>
  )
}
