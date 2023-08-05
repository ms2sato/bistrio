import {
  ConstructViewFunc,
  useRenderSupport,
  useUIEvent,
  useNavigate,
} from 'bistrio'
import { Layout } from './Layout'
import { RoutesWrapper } from '@/isomorphic/components/RoutesWrapper'

export const constructView: ConstructViewFunc = ({ routes, hydrate, ctx }) => {
  return (
    <Layout hydrate={hydrate} ctx={ctx}>
      <RoutesWrapper>{routes}</RoutesWrapper>
    </Layout>
  )
}

function Header() {
  const rs = useRenderSupport()
  const navigate = useNavigate()
  const { handleEvent, pending } = useUIEvent({
    modifier: () => rs.resources().auth.logout(),
    onSuccess: () => navigate('/', { purge: true }),
  })
  return (
    <header>
      {pending ? (
        '...'
      ) : (
        <a href="#" onClick={handleEvent}>
          Logout
        </a>
      )}
    </header>
  )
}
