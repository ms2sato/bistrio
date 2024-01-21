import express from 'express'
import { Outlet } from 'react-router-dom'
import { ServerRenderSupport } from './server-render-support.js'
import { ActionDescriptor, IdNumberParams, LoadPageFunc, blankSchema, opt } from './shared/index.js'
import { CreateActionOptionFunction } from './action-context.js'
import { ConstructViewFunc, Resource, ServerRouterConfig, idNumberSchema } from '../index.js'
import { buildActionContextCreator } from './build-action-context-creator.js'
import { initServerRouterConfig } from './init-server-router-config.js'
import {
  RoutesFunction,
  buildRouter,
  fakeRequest,
  getEndpoints,
  MockResources,
  getDummyServerRouterImpl,
} from '../misc/spec-util.js'

type ActionOption = { test: number }
type TestReturn = { msg: string; opt?: opt<ActionOption> }

const dummyResource = {
  build: () => ({ msg: 'ret build' }),
  show: ({ id }: IdNumberParams) => ({ msg: `ret show ${id}` }),
  hasOption: (ao: opt<ActionOption>) => ({ msg: 'ret hasOption', opt: ao.body }),
} as const satisfies Resource

const mockResources = { '/test/resource': dummyResource }

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
const loadPage: LoadPageFunc = () => DummyComponent

const dummyProps = {
  routes: dummyRoutes,
  mockResources,
  loadPage,
}

type CreateDummyActionContextProps = {
  routes: RoutesFunction
  mockResources: MockResources
  serverRouterConfig?: ServerRouterConfig
  loadPage: LoadPageFunc
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

  describe('validations', () => {
    test('Router.resources 1st argument is not blank string', () => {
      const router = getDummyServerRouterImpl({ loadPage })
      expect(() => {
        router.resources('', {
          name: 'test_resource',
          actions: [{ action: 'build', method: 'get', path: '/build' }],
        })
      }).toThrow('Router.resources() first argument cannnot be blank string')
    })
  })

  describe('endpoints', () => {
    test('simple', async () => {
      const router = await buildRouter(dummyProps)
      expect(getEndpoints(router)).toStrictEqual([
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
        serverRouterConfig: initServerRouterConfig({ createActionOptions, baseDir: './', loadPage }),
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
        serverRouterConfig: initServerRouterConfig({ createActionOptions, baseDir: './', loadPage }),
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
        get: function (key: string) {
          return this.headers[key]
        },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret build' })
    })

    // FIXME: not supported
    xtest('blank resource', async () => {
      const router = await buildRouter({
        mockResources: {
          '/resource': {
            load: () => ({ msg: 'ret user item' }),
          },
        },
        routes: (router) => {
          router.resources('/', {
            name: 'items',
            actions: [{ action: 'load', method: 'get', path: '/', type: 'json' }],
          })
        },
        loadPage,
      })

      expect(getEndpoints(router)).toStrictEqual([
        {
          methods: ['GET'],
          path: '.json',
        },
      ])

      const ret = await fakeRequest<TestReturn>(router, {
        url: '.json',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret user item' })
    })

    // FIXME: not supported
    xtest('blank nested resource', async () => {
      const router = await buildRouter({
        mockResources: {
          '/tasks/resource': {
            load: () => ({ msg: 'ret user item' }),
          },
        },
        routes: (router) => {
          router.sub('/tasks').resources('/', {
            name: 'items',
            actions: [{ action: 'load', method: 'get', path: '/', type: 'json' }],
          })
        },
        loadPage,
      })

      expect(getEndpoints(router)).toStrictEqual([
        {
          methods: ['GET'],
          path: '/tasks.json',
        },
      ])

      const ret = await fakeRequest<TestReturn>(router, {
        url: 'tasks.json',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret user item' })
    })
    test('requests nested', async () => {
      const router = await buildRouter({
        mockResources: {
          '/users/$userId/items/resource': {
            index: () => ({ msg: 'ret user item' }),
          },
        },
        routes: (router) => {
          router.sub('/users/$userId').resources('/items', {
            name: 'items',
            actions: [{ action: 'index', method: 'get', path: '/' }],
          })
        },
        loadPage,
      })

      expect(getEndpoints(router)).toStrictEqual([
        {
          methods: ['GET'],
          path: '/users/:userId/items.:format?',
        },
      ])

      const ret = await fakeRequest<TestReturn>(router, {
        url: '/users/1/items',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret user item' })
    })

    test('requests nested loose separator', async () => {
      const router = await buildRouter({
        mockResources: {
          '/users/$userId/items/resource': {
            index: () => ({ msg: 'ret user item' }),
          },
        },
        routes: (router) => {
          router.sub('users/$userId').resources('items', {
            name: 'items',
            actions: [{ action: 'index', method: 'get', path: '/' }],
          })
        },
        loadPage,
      })

      expect(getEndpoints(router)).toStrictEqual([
        {
          methods: ['GET'],
          path: '/users/:userId/items.:format?',
        },
      ])

      const ret = await fakeRequest<TestReturn>(router, {
        url: '/users/1/items',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret user item' })
    })

    test('requests with actionOpitons', async () => {
      const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
      const router = await buildRouter({
        ...dummyProps,
        serverRouterConfig: initServerRouterConfig({
          createActionOptions,
          baseDir: './',
          loadPage: () => DummyComponent,
        }),
      })

      const ret = await fakeRequest(router, {
        url: '/test/has_option',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
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
          '/test/resource': {
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
        loadPage,
      })

      const ret = await fakeRequest(router, {
        url: '/test/get',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
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
          '/test/resource': {
            get(_params: IdNumberParams) {
              throw new Error('Unexpected called resource method')
            },
          },
        },
        adapter: {
          get: {
            override: (_ctx) => ({ msg: 'ret adapter get' }),
          },
        },
        loadPage,
      })

      const ret = await fakeRequest(router, {
        url: '/test/1',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        get: function (key: string) {
          return this.headers[key]
        },
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
        loadPage,
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
        loadPage,
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
        loadPage,
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
