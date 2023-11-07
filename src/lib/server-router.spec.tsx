import express from 'express'
import { Outlet } from 'react-router-dom'
import { ServerRenderSupport } from './server-render-support'
import { ActionDescriptor, IdNumberParams, PageLoadFunc, blankSchema, opt } from './shared'
import { CreateActionOptionFunction } from './action-context'
import { ConstructViewFunc, Resource, ServerRouterConfig, idNumberSchema } from '..'
import { buildActionContextCreator } from './build-action-context-creator'
import { initServerRouterConfig } from './init-server-router-config'
import { RoutesFunction, buildRouter, fakeRequest, getEndpoints, MockResources } from '../misc/spec-util'

type ActionOption = { test: number }
type TestReturn = { msg: string; opt?: opt<ActionOption> }

const dummyResource = {
  build: () => {
    return { msg: 'ret build' }
  },
  show: ({ id }: IdNumberParams) => {
    return { msg: `ret show ${id}` }
  },
  hasOption: (ao: opt<ActionOption>) => {
    return { msg: 'ret hasOption', opt: ao.body }
  },
} as const satisfies Resource

const mockResources = { 'endpoint/test/resource': dummyResource }

const dummyRoutes: RoutesFunction = (router) => {
  router.resources('/test', {
    name: 'test_resource',
    actions: [
      { action: 'build', method: 'get', path: '/build' },
      { action: 'hasOption', method: 'get', path: '/has_option' },
      { action: 'show', method: 'get', path: '/$id' },
    ],
    construct: { build: { schema: blankSchema }, hasOption: { schema: blankSchema } },
  })
}

const DummyComponent = () => <div>test</div>
const pageLoadFunc: PageLoadFunc = () => DummyComponent

const dummyProps = {
  routes: dummyRoutes,
  mockResources: mockResources,
  pageLoadFunc,
}

type CreateDummyActionContextProps = {
  routes: RoutesFunction
  mockResources: MockResources
  serverRouterConfig?: ServerRouterConfig
  pageLoadFunc: PageLoadFunc
}

const createDummyActionContext = async (params: CreateDummyActionContextProps) => {
  const router = await buildRouter(params)

  const constructView: ConstructViewFunc = () => <>TestView</>
  const req = {} as express.Request
  const res = { render: () => 1, redirect: () => 1 } as unknown as express.Response
  const httpPath = '/test/build'

  const descriptor: ActionDescriptor = { action: 'build', method: 'get', path: '/build' }
  const ctxCreator = buildActionContextCreator(constructView)
  return ctxCreator({ router, req, res, descriptor, httpPath })
}

describe('ServerRouter', () => {
  const DummyLayout = () => (
    <div className="dummy-layout">
      <Outlet />
    </div>
  )

  describe('endpoints', () => {
    test('simple', async () => {
      const router = await buildRouter(dummyProps)
      const endpoints = getEndpoints(router)
      expect(endpoints).toStrictEqual([
        {
          methods: ['GET'],
          path: '/test/build.:format?',
        },
        {
          methods: ['GET'],
          path: '/test/has_option.:format?',
        },
        {
          methods: ['GET'],
          path: '/test/:id.:format?',
        },
      ])
    })
  })

  describe('in SSR', () => {
    const createServerRenderSupport = async (params: CreateDummyActionContextProps = dummyProps) => {
      const ctx = await createDummyActionContext(params)
      return new ServerRenderSupport(ctx)
    }

    test('access resources', async () => {
      const rs = await createServerRenderSupport()
      expect(await rs.resources().test_resource.build()).toStrictEqual({ msg: 'ret build' })
    })

    test('access resources with params', async () => {
      const rs = await createServerRenderSupport()
      expect(await rs.resources().test_resource.show({ id: 1 })).toStrictEqual({ msg: 'ret show 1' })
    })

    test('access resources with actionOptions', async () => {
      const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
      const rs = await createServerRenderSupport({
        ...dummyProps,
        serverRouterConfig: initServerRouterConfig({ createActionOptions, baseDir: './', pageLoadFunc }),
      })
      expect(await rs.resources().test_resource.hasOption()).toStrictEqual({ msg: 'ret hasOption', opt: { test: 321 } })
    })

    test('access suspendedResources', async () => {
      const rs = await createServerRenderSupport()

      expect.assertions(2)
      try {
        rs.suspendedResources().test_resource.build()
      } catch (susp) {
        expect(susp).toBeInstanceOf(Promise)
        await susp
        expect(rs.suspendedResources().test_resource.build()).toStrictEqual({ msg: 'ret build' })
      }
    })

    test('access suspendedResources with actionOptions', async () => {
      const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
      const rs = await createServerRenderSupport({
        ...dummyProps,
        serverRouterConfig: initServerRouterConfig({ createActionOptions, baseDir: './', pageLoadFunc }),
      })

      // expect.assertions(2)
      try {
        rs.suspendedResources().test_resource.hasOption()
      } catch (susp) {
        expect(susp).toBeInstanceOf(Promise)
        await susp
        expect(await rs.suspendedResources().test_resource.hasOption()).toStrictEqual({
          msg: 'ret hasOption',
          opt: { test: 321 },
        })
      }
    })
  })

  describe('as API', () => {
    test('requests', async () => {
      const router = await buildRouter(dummyProps)

      const ret = await fakeRequest<TestReturn>(router, {
        url: '/test/build',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret build' })
    })

    // test('requests nested', async () => {
    //   const router = await buildRouter({
    //     ...dummyProps,
    //     routes: (router) => {
    //       router.sub('/users/$userId').resources('/items', {
    //         name: 'items',
    //         actions: [{ action: 'index', method: 'get', path: '/' }],
    //       })
    //     }
    //   })

    //   const ret = await fakeRequest<TestReturn>(router, {
    //     url: '/users/1/items',
    //     method: 'GET',
    //     headers: { 'content-type': 'application/json' },
    //   })

    //   expect(ret.statusCode).toBe(200)
    //   expect(ret.data).toStrictEqual({ msg: 'ret build' })
    // })

    test('requests with actionOpitons', async () => {
      const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
      const router = await buildRouter({
        ...dummyProps,
        serverRouterConfig: initServerRouterConfig({
          createActionOptions,
          baseDir: './',
          pageLoadFunc: () => DummyComponent,
        }),
      })

      const ret = await fakeRequest(router, {
        url: '/test/has_option',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({
        msg: 'ret hasOption',
        opt: { test: 321 },
      })
    })
  })

  describe('adapter', () => {
    test('no args', async () => {
      const router = await buildRouter({
        routes: (router) => {
          router.resources('/test', {
            name: 'test_resource',
            actions: [{ action: 'get', method: 'get', path: '/get' }],
            construct: { get: { schema: blankSchema } },
          })
        },
        mockResources: {
          'endpoint/test/resource': {
            get() {
              throw new Error('Unexpected called resource method')
            },
          },
        },
        adapter: {
          get: {
            override: () => ({ msg: 'ret adapter get' }),
          },
        },
        pageLoadFunc,
      })

      const ret = await fakeRequest(router, {
        url: '/test/get',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret adapter get' })
    })

    test('an arg', async () => {
      const router = await buildRouter({
        routes: (router) => {
          router.resources('/test', {
            name: 'test_resource',
            actions: [{ action: 'get', method: 'get', path: '/$id' }],
            construct: { get: { schema: idNumberSchema } },
          })
        },
        mockResources: {
          'endpoint/test/resource': {
            get(_params: IdNumberParams) {
              throw new Error('Unexpected called resource method')
            },
          },
        },
        adapter: {
          get: {
            override: (_ctx, _params: IdNumberParams) => ({ msg: 'ret adapter get' }),
          },
        },
        pageLoadFunc,
      })

      const ret = await fakeRequest(router, {
        url: '/test/1',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret adapter get' })
    })
  })

  describe('layout', () => {
    test('simple', async () => {
      const router = await buildRouter({
        routes: (router) => {
          router.layout({ Component: DummyLayout }).resources('/test', {
            name: 'test_resource',
            actions: [{ action: 'page', method: 'get', path: '/$id', page: true }],
            construct: { show: { schema: blankSchema } },
          })
        },
        mockResources,
        pageLoadFunc,
      })

      const routeObject = router.routerCore.routeObject
      expect(routeObject).toStrictEqual({
        Component: DummyLayout,
        children: [
          {
            children: [
              {
                Component: DummyComponent,
                path: ':id',
              },
            ],
            path: 'test',
          },
        ],
      })
    })

    test('nested', async () => {
      const router = await buildRouter({
        routes: (router) => {
          const layoutRouter = router.layout({ Component: DummyLayout })
          const subRouter = layoutRouter.sub('/sub')
          const subLayoutRouter = subRouter.layout({ Component: DummyLayout })
          subLayoutRouter.resources('/test', {
            name: 'test_resource',
            actions: [{ action: 'page', method: 'get', path: '/$id', page: true }],
            construct: { show: { schema: blankSchema } },
          })
        },
        mockResources,
        pageLoadFunc,
      })

      const routeObject = router.routerCore.routeObject
      expect(routeObject).toStrictEqual({
        Component: DummyLayout,
        children: [
          {
            path: 'sub',
            children: [
              {
                Component: DummyLayout,
                children: [
                  {
                    children: [
                      {
                        Component: DummyComponent,
                        path: ':id',
                      },
                    ],
                    path: 'test',
                  },
                ],
              },
            ],
          },
        ],
      })
    })
  })

  describe('pages', () => {
    test('senario', async () => {
      const router = await buildRouter({
        routes: (router) => {
          router.pages('/', ['/'])

          const layoutRouter = router.layout({ Component: DummyLayout })
          const subRouter = layoutRouter.sub('/sub')
          const subLayoutRouter = subRouter.layout({ Component: DummyLayout })
          subLayoutRouter.pages('/test', ['/$id'])
        },
        mockResources,
        pageLoadFunc,
      })

      expect(getEndpoints(router)).toStrictEqual([
        {
          methods: ['GET'],
          path: '/sub/test/:id.:format?',
        },
        {
          methods: ['GET'],
          path: '.:format?',
        },
      ])

      const routeObject = router.routerCore.routeObject
      expect(routeObject).toStrictEqual({
        Component: DummyLayout,
        children: [
          {
            path: '',
            children: [
              {
                path: '',
                Component: DummyComponent,
              },
            ],
          },
          {
            path: 'sub',
            children: [
              {
                Component: DummyLayout,
                children: [
                  {
                    children: [
                      {
                        Component: DummyComponent,
                        path: ':id',
                      },
                    ],
                    path: 'test',
                  },
                ],
              },
            ],
          },
        ],
      })
    })
  })
})
