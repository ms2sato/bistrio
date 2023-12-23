import { blankSchema } from '../shared/schemas.js'
import { GenerateRouter } from './generate-router.js'

describe('validations', () => {
  test('Resource name MUST not include any marks', () => {
    const router = new GenerateRouter()
    expect(() => router.resources('/test', { name: 'test$Resource1' })).toThrowError()
  })

  test('Resource name MUST start lowercase char', () => {
    const router = new GenerateRouter()
    expect(() => router.resources('/test', { name: 'TestResource1' })).toThrowError()
  })
})

test('resources', () => {
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
})

test('resources with options', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'testResource',
    actions: [{ action: 'build', method: 'get', path: '/$id', page: true }],
    construct: { build: { schema: blankSchema } },
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
    construct: { create: { schema: blankSchema }, update: { schema: blankSchema } },
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
})
