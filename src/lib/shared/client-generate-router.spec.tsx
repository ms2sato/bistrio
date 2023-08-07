import { NamedResources, PageLoadFunc, PageNode, Router, RouterSupport, nullRouterSupport } from '../..'
import { ClientGenretateRouter, createPath, defaultClientConfig } from './client-generate-router'

describe('createPath', () => {
  test('None changes for without placeholder', () => {
    const ret = createPath('/api', '/test/abc', {})
    expect(ret.httpPath).toEqual('/api/test/abc')
    expect(ret.keys).toEqual([])
  })

  test('replace success for :id on pathFormat', () => {
    const ret = createPath('/api', '/test/:id', { id: 3 })
    expect(ret.httpPath).toEqual('/api/test/3')
    expect(ret.keys).toEqual(['id'])
  })

  test('replace success for multi placeholders on pathFormat', () => {
    const ret = createPath('/api', '/parent/:parentId/test/:id', { parentId: 5, id: 3 })
    expect(ret.httpPath).toEqual('/api/parent/5/test/3')
    expect(ret.keys).toEqual(['parentId', 'id'])
  })

  test('replace success for a placeholder on resourceUrl', () => {
    const ret = createPath('/api/parent/:parentId/', 'test/:id', { parentId: 5, id: 3 })
    expect(ret.httpPath).toEqual('/api/parent/5/test/3')
    expect(ret.keys).toEqual(['parentId', 'id'])
  })
})

const pageNameToDummyComponent: Record<string, PageNode> = {
  '/users/:id': () => <div></div>,
}

describe('ClientGenretateRouter', () => {
  test('pickup paages', async () => {
    const pageLoadFunc: PageLoadFunc = (pageName: string) => pageNameToDummyComponent[pageName]
    const routes = (router: Router, _routerSupport: RouterSupport) => {
      router.resources('/users', {
        name: 'user',
        actions: [{ action: 'show', method: 'get', path: '/:id', page: true }],
      })

      router.resources('/tasks', {
        name: 'task',
        actions: [{ action: 'show', method: 'get', path: '/:id' }], // will not pickup, because of `page: false`
      })
    }

    const cgr = new ClientGenretateRouter<NamedResources>(
      { ...defaultClientConfig(), host: () => 'dummy' },
      pageLoadFunc,
    )
    routes(cgr, nullRouterSupport) // routerSupport and Middleware is not working on client side
    await cgr.build()
    const core = cgr.getCore()

    expect(core.routeObject).toStrictEqual({
      children: [{ path: 'users', children: [{ path: ':id', Component: pageNameToDummyComponent['/users/:id'] }] }],
    })
  })
})
