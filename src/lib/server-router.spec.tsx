import express from 'express'
import { ConstructViewFunc, ServerRenderSupport, buildActionContextCreator } from './server-render-support'
import { ServerRouter, ServerRouterConfigCustom } from './server-router'
import { ActionDescriptor, RouteConfig, StandardJsonSuccess, blankSchema, opt } from './shared'
import { CreateActionOptionFunction } from './action-context'

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

class TestServerRouter extends ServerRouter {
  protected async loadResource(_resourcePath: string, _routeConfig: RouteConfig) {
    return Promise.resolve({
      build: () => {
        return { msg: 'ret build' }
      },
      hasOption: (ao: opt<ActionOption>) => {
        console.log(ao)
        return { msg: 'ret hasOption', opt: ao.body }
      },
    })
  }

  protected loadAdapter(_adapterPath: string, _routeConfig: RouteConfig) {
    return Promise.resolve({})
  }
}

const buildRouter = async ({
  serverRouterConfig,
}: {
  serverRouterConfig?: ServerRouterConfigCustom
}): Promise<TestServerRouter> => {
  const router = new TestServerRouter(serverRouterConfig)
  router.resources('/test', {
    name: 'test_resource',
    actions: [
      { action: 'build', method: 'get', path: '/build' },
      { action: 'hasOption', method: 'get', path: '/has_option' },
    ],
    construct: { build: { schema: blankSchema }, hasOption: { schema: blankSchema } },
  })
  await router.build()
  return router
}

const createDummyActionContext = async (params: { serverRouterConfig?: ServerRouterConfigCustom }) => {
  const router = await buildRouter(params)

  const constructView: ConstructViewFunc = () => <>TextView</>
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

    test('access resources with actionOptions', async () => {
      const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
      const rs = await createServerRenderSupport({ serverRouterConfig: { createActionOptions, baseDir: './' } })
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
      const rs = await createServerRenderSupport({ serverRouterConfig: { createActionOptions, baseDir: './' } })

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
      const router = await buildRouter({ serverRouterConfig: { createActionOptions, baseDir: './' } })

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
})
