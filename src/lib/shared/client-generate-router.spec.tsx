import { Outlet } from 'react-router-dom'
import { NamedResources, PageNode, Router } from '../..'
import { ClientGenretateRouter, createPath, defaultClientConfig } from './client-generate-router'

const clientConfig = defaultClientConfig()

describe('createPath', () => {
  test('None changes for without placeholder', () => {
    const ret = createPath(clientConfig, '/api', '/test/abc', {})
    expect(ret.httpPath).toEqual('/api/test/abc')
    expect(ret.keys).toEqual([])
  })

  test('replace success for :id on pathFormat', () => {
    const ret = createPath(clientConfig, '/api', '/test/$id', { id: 3 })
    expect(ret.httpPath).toEqual('/api/test/3')
    expect(ret.keys).toEqual(['id'])
  })

  test('replace success for multi placeholders on pathFormat', () => {
    const ret = createPath(clientConfig, '/api', '/parent/$parentId/test/$id', { parentId: 5, id: 3 })
    expect(ret.httpPath).toEqual('/api/parent/5/test/3')
    expect(ret.keys).toEqual(['parentId', 'id'])
  })

  test('replace success for a placeholder on resourceUrl', () => {
    const ret = createPath(clientConfig, '/api/parent/$parentId/', 'test/$id', { parentId: 5, id: 3 })
    expect(ret.httpPath).toEqual('/api/parent/5/test/3')
    expect(ret.keys).toEqual(['parentId', 'id'])
  })
})

const pageNameToDummyComponent: Record<string, PageNode> = {
  '/users/$id': () => <div></div>,
  '/sub/tasks/$id': () => <div></div>,
}

const DummyLayout = () => (
  <div>
    <Outlet></Outlet>
  </div>
)

describe('ClientGenretateRouter', () => {
  const buildRouter = async (routes: (router: Router) => void) => {
    const cgr = new ClientGenretateRouter<NamedResources>(
      { ...defaultClientConfig(), host: () => 'dummy' },
      (pageName: string) => pageNameToDummyComponent[pageName],
    )
    routes(cgr) // routerSupport and Middleware is not working on client side
    await cgr.build()
    return cgr
  }

  test('pickup pages', async () => {
    const routes = (router: Router) => {
      router.resources('/users', {
        name: 'user',
        actions: [{ action: 'show', method: 'get', path: '/$id', page: true }],
      })

      router.resources('/tasks', {
        name: 'task',
        actions: [{ action: 'show', method: 'get', path: '/$id' }], // will not pickup, because of `page: false`
      })
    }

    const router = await buildRouter(routes)
    const core = router.getCore()

    expect(core.routeObject).toStrictEqual({
      children: [{ path: 'users', children: [{ path: ':id', Component: pageNameToDummyComponent['/users/$id'] }] }],
    })
  })

  test('simple layout', async () => {
    const routes = (router: Router) => {
      const layoutRouter = router.layout({ Component: DummyLayout })

      layoutRouter.resources('/users', {
        name: 'user',
        actions: [{ action: 'show', method: 'get', path: '/$id', page: true }],
      })

      layoutRouter.resources('/tasks', {
        name: 'task',
        actions: [{ action: 'show', method: 'get', path: '/$id' }], // will not pickup, because of `page: false`
      })
    }

    const router = await buildRouter(routes)
    const core = router.getCore()

    expect(core.routeObject).toStrictEqual({
      Component: DummyLayout,
      children: [{ path: 'users', children: [{ path: ':id', Component: pageNameToDummyComponent['/users/$id'] }] }],
    })
  })

  test('nested layout', async () => {
    const routes = (router: Router) => {
      const layoutRouter = router.layout({ Component: DummyLayout })

      layoutRouter.resources('/users', {
        name: 'user',
        actions: [{ action: 'show', method: 'get', path: '/$id', page: true }],
      })

      const subRouter = layoutRouter.sub('sub')
      const subLayoutRouter = subRouter.layout({ Component: DummyLayout })
      subLayoutRouter.resources('/tasks', {
        name: 'task',
        actions: [{ action: 'show', method: 'get', path: '/$id' }], // will not pickup, because of `page: false`
      })
    }

    const router = await buildRouter(routes)
    const core = router.getCore()

    expect(core.routeObject).toStrictEqual({
      Component: DummyLayout,
      children: [
        { path: 'users', children: [{ path: ':id', Component: pageNameToDummyComponent['/users/$id'] }] },
        { path: 'sub', children: [{ Component: DummyLayout }] },
      ],
    })
  })

  test('pages', async () => {
    const routes = (router: Router) => {
      const layoutRouter = router.layout({ Component: DummyLayout })

      layoutRouter.pages('/users', ['/$id'])

      const subRouter = layoutRouter.sub('sub')
      const subLayoutRouter = subRouter.layout({ Component: DummyLayout })
      subLayoutRouter.pages('/tasks', ['/$id'])
    }

    const router = await buildRouter(routes)
    const core = router.getCore()

    expect(core.routeObject).toStrictEqual({
      Component: DummyLayout,
      children: [
        { path: 'users', children: [{ path: ':id', Component: pageNameToDummyComponent['/users/$id'] }] },
        {
          path: 'sub',
          children: [
            {
              Component: DummyLayout,
              children: [
                { path: 'tasks', children: [{ path: ':id', Component: pageNameToDummyComponent['/sub/tasks/$id'] }] },
              ],
            },
          ],
        },
      ],
    })
  })
})
