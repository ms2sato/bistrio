import express from 'express'
import { ServerRenderSupport } from './server-render-support'
import { ImportAndSetupFunc, ServerRouter, ServerRouterConfigCustom } from './server-router'
import {
  ActionDescriptor,
  IdNumberParams,
  PageLoadFunc,
  RouteConfig,
  StandardJsonSuccess,
  blankSchema,
  opt,
} from './shared'
import { Adapter, CreateActionOptionFunction } from './action-context'
import { ConstructViewFunc, Resource, idNumberSchema } from '..'
import { buildActionContextCreator } from './build-action-context-creator'
import { Outlet } from 'react-router-dom'

type ActionOption = { test: number }
type VirtualRequest = { url: string; method: string; headers: Record<string, string> }
type Handle = (
  req: VirtualRequest,
  res: {
    render: () => void
    redirect: () => void
    status: (value: number) => void
    json: (ret: StandardJsonSuccess) => void
  },
  out: () => void,
) => void
type Handlable = { handle: Handle }
type TestReturn = { msg: string; opt?: opt<ActionOption> }
type VirtualResponse = { statusCode: number; data: TestReturn }

const checkHandlable = (router: unknown): router is Handlable => 'handle' in (router as Handlable)

const virtualRequest = (router: ServerRouter, req: VirtualRequest): Promise<VirtualResponse> =>
  new Promise<VirtualResponse>((resolve, reject) => {
    const expressRouter = router.router
    if (!checkHandlable(expressRouter)) {
      throw new Error('Unexpexted router type')
    }

    let statusCode: number
    // @see https://stackoverflow.com/questions/33090091/is-it-possible-to-call-express-router-directly-from-code-with-a-fake-request
    expressRouter.handle(
      req,
      {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        render() {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        redirect() {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        status(value: number) {
          statusCode = value
          return this
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        json(ret: StandardJsonSuccess) {
          const data = ret.data as VirtualResponse['data']
          resolve({ statusCode, data })
        },
      },
      (...args: unknown[]) => {
        reject(args[0])
      },
    )
  })

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

class TestServerRouter<R extends Resource> extends ServerRouter {
  constructor(
    props: ServerRouterConfigCustom,
    private resource: R,
    private adapter: Adapter = {},
  ) {
    super(props)
  }

  protected async loadResource(_resourcePath: string, _routeConfig: RouteConfig) {
    return Promise.resolve(this.resource)
  }

  protected loadAdapter(_adapterPath: string, _routeConfig: RouteConfig) {
    return Promise.resolve(this.adapter)
  }
}

const DummyComponent = () => <div>test</div>
const pageLoadFunc: PageLoadFunc = () => DummyComponent
const importAndSetup: ImportAndSetupFunc = <S, R>(
  _fileRoot: string,
  _modulePath: string,
  _support: S,
  _config: RouteConfig,
) => {
  return {} as R
}

const buildRouter = async ({
  serverRouterConfig,
}: {
  serverRouterConfig?: ServerRouterConfigCustom
}): Promise<TestServerRouter<typeof dummyResource>> => {
  const router = new TestServerRouter(
    serverRouterConfig || { baseDir: './', pageLoadFunc, importAndSetup },
    dummyResource,
  )
  router.resources('/test', {
    name: 'test_resource',
    actions: [
      { action: 'build', method: 'get', path: '/build' },
      { action: 'hasOption', method: 'get', path: '/has_option' },
      { action: 'show', method: 'get', path: '/:id' },
    ],
    construct: { build: { schema: blankSchema }, hasOption: { schema: blankSchema } },
  })
  await router.build()
  return router
}

const createDummyActionContext = async (params: { serverRouterConfig?: ServerRouterConfigCustom }) => {
  const router = await buildRouter(params)

  const constructView: ConstructViewFunc = () => <>TestView</>
  const req = {} as express.Request
  const res = { render: () => 1, redirect: () => 1 } as unknown as express.Response
  const httpPath = '/test/build'

  const descriptor: ActionDescriptor = { action: 'build', method: 'get', path: '/build' }
  const ctxCreator = buildActionContextCreator('', constructView, 'failure text')
  return ctxCreator({ router, req, res, descriptor, httpPath })
}

describe('ServerRouter', () => {
  describe('in SSR', () => {
    const createServerRenderSupport = async (params: { serverRouterConfig?: ServerRouterConfigCustom } = {}) => {
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
        serverRouterConfig: { createActionOptions, baseDir: './', pageLoadFunc, importAndSetup },
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
        serverRouterConfig: { createActionOptions, baseDir: './', pageLoadFunc, importAndSetup },
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
      const router = await buildRouter({})

      const ret = await virtualRequest(router, {
        url: '/test/build',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret build' })
    })

    test('requests with actionOpitons', async () => {
      const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
      const router = await buildRouter({
        serverRouterConfig: { createActionOptions, baseDir: './', pageLoadFunc: () => DummyComponent, importAndSetup },
      })

      const ret = await virtualRequest(router, {
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
      const router = new TestServerRouter(
        { baseDir: './', pageLoadFunc, importAndSetup },
        {
          get() {
            throw new Error('Unexpected called resource method')
          },
        },
        {
          get: {
            override: () => ({ msg: 'ret adapter get' }),
          },
        },
      )
      router.resources('/test', {
        name: 'test_resource',
        actions: [{ action: 'get', method: 'get', path: '/get' }],
        construct: { get: { schema: blankSchema } },
      })
      await router.build()

      const ret = await virtualRequest(router, {
        url: '/test/get',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret adapter get' })
    })

    test('an arg', async () => {
      const router = new TestServerRouter(
        { baseDir: './', pageLoadFunc, importAndSetup },
        {
          get(_params: IdNumberParams) {
            throw new Error('Unexpected called resource method')
          },
        },
        {
          get: {
            override: (_ctx, _params: IdNumberParams) => ({ msg: 'ret adapter get' }),
          },
        },
      )
      router.resources('/test', {
        name: 'test_resource',
        actions: [{ action: 'get', method: 'get', path: '/:id' }],
        construct: { get: { schema: idNumberSchema } },
      })
      await router.build()

      const ret = await virtualRequest(router, {
        url: '/test/1',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      })

      expect(ret.statusCode).toBe(200)
      expect(ret.data).toStrictEqual({ msg: 'ret adapter get' })
    })
  })

  describe('layout', () => {
    const DummyLayout = () => (
      <div className="dummy-layout">
        <Outlet />
      </div>
    )

    test('simple', async () => {
      const router = new TestServerRouter({ baseDir: './', pageLoadFunc, importAndSetup }, dummyResource)
      router.layout({ Component: DummyLayout }).resources('/test', {
        name: 'test_resource',
        actions: [{ action: 'page', method: 'get', path: '/:id', page: true }],
        construct: { show: { schema: blankSchema } },
      })
      await router.build()

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
      const router = new TestServerRouter({ baseDir: './', pageLoadFunc, importAndSetup }, dummyResource)
      const layoutRouter = router.layout({ Component: DummyLayout })
      const subRouter = layoutRouter.sub('/sub')
      const subLayoutRouter = subRouter.layout({ Component: DummyLayout })
      subLayoutRouter.resources('/test', {
        name: 'test_resource',
        actions: [{ action: 'page', method: 'get', path: '/:id', page: true }],
        construct: { show: { schema: blankSchema } },
      })
      await router.build()

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
})
