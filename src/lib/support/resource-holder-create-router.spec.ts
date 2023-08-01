import { CreateActionOptionFunction } from '../action-context'
import { ServerRouterConfigCustom } from '../server-router'
import { RouteConfig, blankSchema, opt } from '../shared'
import { ResourceHolderCreateRouter } from './resource-holder-create-router'

type ActionOption = { test: number }

class TestServerRouter extends ResourceHolderCreateRouter {
  protected async loadResource(_resourcePath: string, _routeConfig: RouteConfig) {
    return Promise.resolve({
      build: () => {
        return { msg: 'ret build' }
      },
      hasOption: (ao: opt<ActionOption>) => {
        return { msg: 'ret hasOption', opt: ao.body }
      },
    })
  }

  protected loadAdapter(_adapterPath: string, _routeConfig: RouteConfig) {
    return Promise.resolve({})
  }
}

const buildHolder = async ({
  serverRouterConfig,
}: {
  serverRouterConfig: ServerRouterConfigCustom
}): Promise<Record<string, any>> => {
  const holder: Record<string, any> = {}
  const router = new TestServerRouter(holder, serverRouterConfig)
  router.resources('/test', {
    name: 'test_resource',
    actions: [
      { action: 'build', method: 'get', path: '/build' },
      { action: 'hasOption', method: 'get', path: '/has_option' },
      { action: 'pageOnly', method: 'get', path: '/page_only', page: true },
    ],
    construct: { build: { schema: blankSchema }, hasOption: { schema: blankSchema } },
  })
  await router.build()
  return holder
}

test('standard', async () => {
  const holder = await buildHolder({ serverRouterConfig: { baseDir: './' } })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  expect(await holder.test_resource.build()).toStrictEqual({ msg: 'ret build' })
})

test('with actionOption', async () => {
  const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })
  const holder = await buildHolder({ serverRouterConfig: { baseDir: './', createActionOptions } })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  expect(await holder.test_resource.hasOption(new opt({ test: 123 }))).toStrictEqual({
    msg: 'ret hasOption',
    opt: { test: 123 },
  })
})
