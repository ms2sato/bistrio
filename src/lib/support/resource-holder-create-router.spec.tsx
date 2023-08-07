import { CreateActionOptionFunction } from '../action-context'
import { FileNotFoundError, PageLoadFunc, Resource, blankSchema, opt } from '../shared'
import { ResourceHolderCreateRouter } from './resource-holder-create-router'

type ActionOption = { test: number }

const DummyComponent = () => <div>test</div>
const pageLoadFunc: PageLoadFunc = () => DummyComponent

test('standard', async () => {
  const holder: Record<string, Resource> = {}
  const router = new ResourceHolderCreateRouter(holder, { baseDir: './', pageLoadFunc })
  const spy = jest.spyOn(router as any, 'loadResource').mockImplementation(() =>
    Promise.resolve({
      build: () => ({ msg: 'ret build' }),
    }),
  )

  router.resources('/test', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/build' }],
    construct: { build: { schema: blankSchema } },
  })
  await router.build()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  expect(await holder.test_resource.build()).toStrictEqual({ msg: 'ret build' })
  spy.mockRestore()
})

test('with actionOption', async () => {
  const createActionOptions: CreateActionOptionFunction = () => ({ test: 321 })

  const holder: Record<string, Resource> = {}
  const router = new ResourceHolderCreateRouter(holder, { baseDir: './', createActionOptions, pageLoadFunc })
  const spy = jest.spyOn(router as any, 'loadResource').mockImplementation(() =>
    Promise.resolve({
      hasOption: (ao: opt<ActionOption>) => ({ msg: 'ret hasOption', opt: ao.body }),
    }),
  )

  router.resources('/test', {
    name: 'test_resource',
    actions: [{ action: 'hasOption', method: 'get', path: '/has_option' }],
    construct: { hasOption: { schema: blankSchema } },
  })
  await router.build()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  expect(await holder.test_resource.hasOption(new opt({ test: 123 }))).toStrictEqual({
    msg: 'ret hasOption',
    opt: { test: 123 },
  })
  spy.mockRestore()
})

test('page only', async () => {
  const holder: Record<string, Resource> = {}
  const router = new ResourceHolderCreateRouter(holder, { baseDir: './', pageLoadFunc })
  const spy = jest.spyOn(router as any, 'loadResource').mockImplementation(() => {
    throw new FileNotFoundError('Resource Not Found') // but handled if page only
  })

  router.resources('/test', {
    name: 'test_resource',
    actions: [{ action: 'index', method: 'get', path: '/index', page: true }],
  })
  await router.build()

  spy.mockRestore()
})

// TODO: resource not found but page found
