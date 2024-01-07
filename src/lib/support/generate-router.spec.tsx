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
        construct: { build: { schema: blankSchema } },
      })
    }).toThrow('Router.resources() first argument cannnot be blank string')
  })
})

test('resources', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'testResource',
    actions: [{ action: 'list', method: 'get', path: '/' }],
    construct: { list: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testResource$list',
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
    .toEqual(`export const testResource$list = Object.freeze({ path: () => { return \`/test/\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test = Object.freeze({ path: () => { return \`/test/\` }, method: 'get' })
`)
  expect(router.generateInterfaces(serverRouterConfig)).toEqual(`

export interface TestResource<OP> {
  list(options?: OP): unknown
}
`)
})

test('resources page action only', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'testResource',
    actions: [{ action: 'build', method: 'get', path: '/build', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testResource$build',
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
    .toEqual(`export const testResource$build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)

  // if page is true only, no interface is generated
  expect(router.generateInterfaces(serverRouterConfig)).toEqual(``)
})

test('resources with route parameters', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'testResource',
    actions: [{ action: 'load', method: 'get', path: '/$id' }],
    construct: { load: { schema: testResourceSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testResource$load',
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
    .toEqual(`export const testResource$load = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateInterfaces(serverRouterConfig)).toEqual(`export type TestResourceLoadParams = {
    testId: string;
    id: number;
}

export interface TestResource<OP> {
  load(params: TestResourceLoadParams, options?: OP): unknown
}
`)
})

test('resources page action only with route parameters', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'testResource',
    actions: [{ action: 'build', method: 'get', path: '/$id', page: true }],
    construct: { build: { schema: testResourceSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testResource$build',
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
    .toEqual(`export const testResource$build = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)

  expect(router.generateInterfaces(serverRouterConfig)).toEqual(``)
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
    name: 'testResource',
    actions: [
      { action: 'create', method: 'post', path: '/' },
      { action: 'update', method: ['patch', 'put'], path: '/$id' },
      { action: 'delete', method: 'delete', path: '/$id' },
    ],
    construct: {
      create: { schema: testResourceSchema },
      update: { schema: testResourceSchema },
      delete: { schema: idNumberSchema },
    },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testResource$create',
    methods: ['post'],
    link: '/test/',
    optionNames: [],
  })
  expect(router.links.named[1]).toEqual({
    name: 'testResource$update',
    methods: ['patch', 'put'],
    link: '/test/${id}',
    optionNames: ['id'],
  })
  expect(router.links.named[2]).toEqual({
    name: 'testResource$delete',
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
    .toEqual(`export const testResource$create = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const testResource$update = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put'] })
export const testResource$delete = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: 'delete' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const __test = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const __test__$ = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put', 'delete'] })
`)

  expect(router.generateInterfaces(serverRouterConfig)).toEqual(`export type TestResourceCreateParams = {
    testId: string;
    id: number;
}
export type TestResourceUpdateParams = {
    testId: string;
    id: number;
}
export type TestResourceDeleteParams = {
    id: number;
}

export interface TestResource<OP> {
  create(params: TestResourceCreateParams, options?: OP): unknown
  update(params: TestResourceUpdateParams, options?: OP): unknown
  delete(params: TestResourceDeleteParams, options?: OP): unknown
}
`)
})
