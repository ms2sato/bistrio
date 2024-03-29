import { z } from 'zod'
import { blankSchema, idNumberSchema } from '../shared/schemas.js'
import { GenerateRouter } from './generate-router.js'
import { ServerRouterConfig } from '../server-router-config.js'
import { initServerRouterConfig } from '../init-server-router-config.js'

const testResourceSchema = z.object({
  testId: z.string(),
  id: z.number(),
})

const serverRouterConfig: ServerRouterConfig = initServerRouterConfig({
  baseDir: './server',
  loadPage: () => () => <div>test</div>,
})

describe('validations', () => {
  test('Resource name MUST not include any marks', () => {
    const router = new GenerateRouter()
    expect(() => router.resources('/test', { name: 'test$Resource1' })).toThrowError()
  })

  test('Resource name MUST start lowercase char', () => {
    const router = new GenerateRouter()
    expect(() => router.resources('/test', { name: 'TestResource1' })).toThrowError()
  })

  test('Action MUST not include any marks except for "_"', () => {
    const router = new GenerateRouter()
    expect(() =>
      router.resources('/test', { name: 'testResource1', actions: [{ action: 'test$1', method: 'get', path: '/' }] }),
    ).toThrowError()

    expect(() =>
      router.resources('/test', { name: 'testResource1', actions: [{ action: 'test_1', method: 'get', path: '/' }] }),
    ).not.toThrowError()
  })

  test('Action MUST start lowercase char', () => {
    const router = new GenerateRouter()
    expect(() =>
      router.resources('/test', { name: 'testResource1', actions: [{ action: 'Test1', method: 'get', path: '/' }] }),
    ).toThrowError()
  })

  test('Router.resources 1st argument is not blank string', () => {
    const router = new GenerateRouter()
    expect(() => {
      // blank rpath
      router.resources('', {
        name: 'test_resource',
        actions: [{ action: 'build', method: 'get', path: '/build' }],
        inputs: { build: { schema: blankSchema } },
      })
    }).toThrow('Router.resources() first argument cannnot be blank string')
  })
})

test('resources', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'testName',
    actions: [{ action: 'list', method: 'get', path: '/' }],
    inputs: { list: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testName$list',
    methods: ['get'],
    link: '/test/',
    optionNames: [],
  })
  expect(router.links.unnamed[0]).toEqual({
    name: 'test',
    methods: ['get'],
    link: '/test/',
    optionNames: [],
  })
  expect(router.generateNamedEndpoints())
    .toEqual(`export const testName$list = Object.freeze({ path: () => { return \`/test/\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test = Object.freeze({ path: () => { return \`/test/\` }, method: 'get' })
`)
  expect(router.generateInterfaces(serverRouterConfig)).toEqual(`

export interface TestNameResource<OP> {
  list(options: OP): unknown
}
`)
})

test('resources page action only', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'testName',
    actions: [{ action: 'build', method: 'get', path: '/build', page: true }],
    inputs: { build: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testName$build',
    methods: ['get'],
    link: '/test/build',
    optionNames: [],
  })
  expect(router.links.unnamed[0]).toEqual({
    name: 'test__build',
    methods: ['get'],
    link: '/test/build',
    optionNames: [],
  })
  expect(router.generateNamedEndpoints())
    .toEqual(`export const testName$build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)

  // if page is true only, no interface is generated
  expect(router.generateInterfaces(serverRouterConfig)).toEqual('')
})

test('resources with route parameters', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'testName',
    actions: [{ action: 'load', method: 'get', path: '/$id' }],
    inputs: { load: { schema: testResourceSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testName$load',
    methods: ['get'],
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })
  expect(router.links.unnamed[0]).toEqual({
    name: 'test__$__$',
    methods: ['get'],
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })

  expect(router.generateNamedEndpoints())
    .toEqual(`export const testName$load = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateInterfaces(serverRouterConfig)).toEqual(`export type TestNameResourceLoadParams = {
    testId: string;
    id: number;
}

export interface TestNameResource<OP> {
  load(params: TestNameResourceLoadParams, options: OP): unknown
}
`)
})

test('resources page action only with route parameters', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'testName',
    actions: [{ action: 'build', method: 'get', path: '/$id', page: true }],
    inputs: { build: { schema: testResourceSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testName$build',
    methods: ['get'],
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })
  expect(router.links.unnamed[0]).toEqual({
    name: 'test__$__$',
    methods: ['get'],
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })

  expect(router.generateNamedEndpoints())
    .toEqual(`export const testName$build = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateInterfaces(serverRouterConfig)).toEqual('')
})

test('pages', () => {
  const router = new GenerateRouter()

  router.pages('/test', ['build'])

  expect(router.links.unnamed[0]).toEqual({
    name: 'test__build',
    methods: ['get'],
    link: '/test/build',
    optionNames: [],
  })
  expect(router.generateUnnamedEndpoints()).toEqual(
    `export const __test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`,
  )
})

test('pages root', () => {
  const router = new GenerateRouter()

  router.pages('/', [''])

  expect(router.links.unnamed[0]).toEqual({
    name: 'root',
    methods: ['get'],
    link: '/',
    optionNames: [],
  })
  expect(router.generateUnnamedEndpoints()).toEqual(
    `export const __root = Object.freeze({ path: () => { return \`/\` }, method: 'get' })
`,
  )
})

test('pages with options', () => {
  const router = new GenerateRouter()

  router.pages('/test/$testId', ['$id'])

  expect(router.links.unnamed[0]).toEqual({
    name: 'test__$__$',
    methods: ['get'],
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)
})

test('multiple', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'testName',
    actions: [
      { action: 'create', method: 'post', path: '/' },
      { action: 'update', method: ['patch', 'put'], path: '/$id' },
      { action: 'delete', method: 'delete', path: '/$id' },
    ],
    inputs: {
      create: { schema: testResourceSchema },
      update: { schema: testResourceSchema },
      delete: { schema: idNumberSchema },
    },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testName$create',
    methods: ['post'],
    link: '/test/',
    optionNames: [],
  })
  expect(router.links.named[1]).toEqual({
    name: 'testName$update',
    methods: ['patch', 'put'],
    link: '/test/${id}',
    optionNames: ['id'],
  })
  expect(router.links.named[2]).toEqual({
    name: 'testName$delete',
    methods: ['delete'],
    link: '/test/${id}',
    optionNames: ['id'],
  })
  expect(router.links.unnamed[0]).toEqual({ name: 'test', methods: ['post'], link: '/test/', optionNames: [] })
  expect(router.links.unnamed[1]).toEqual({
    name: 'test__$',
    methods: ['patch', 'put', 'delete'],
    link: '/test/${id}',
    optionNames: ['id'],
  })

  expect(router.generateNamedEndpoints())
    .toEqual(`export const testName$create = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const testName$update = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put'] })
export const testName$delete = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: 'delete' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const __test__$ = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put', 'delete'] })
`)

  expect(router.generateInterfaces(serverRouterConfig)).toEqual(`export type TestNameResourceCreateParams = {
    testId: string;
    id: number;
}
export type TestNameResourceUpdateParams = {
    testId: string;
    id: number;
}
export type TestNameResourceDeleteParams = {
    id: number;
    format?: string | undefined;
}

export interface TestNameResource<OP> {
  create(params: TestNameResourceCreateParams, options: OP): unknown
  update(params: TestNameResourceUpdateParams, options: OP): unknown
  delete(params: TestNameResourceDeleteParams, options: OP): unknown
}
`)
})
