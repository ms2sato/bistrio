import { blankSchema } from '../shared/schemas.js'
import { GenerateRouter } from './generate-router.js'

test('resources', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'testResource',
    actions: [{ action: 'build', method: 'get', path: '/build', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'testResource_build',
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
    .toEqual(`export const testResource_build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
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
    name: 'testResource_build',
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
    .toEqual(`export const testResource_build = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
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
    `export const test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
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
    .toEqual(`export const test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
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
    name: 'testResource_create',
    methods: ['post'],
    link: '/test/',
    optionNames: [],
  })
  expect(router.links.unnamed[0]).toEqual({ name: 'test__', methods: ['post'], link: '/test/', optionNames: [] })
  expect(router.links.unnamed[1]).toEqual({ name: 'test__$', methods: ['patch', 'put', 'delete'], link: '/test/${id}', optionNames: ['id'] })

  expect(router.generateNamedEndpoints())
    .toEqual(`export const testResource_create = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const testResource_update = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put'] })
export const testResource_delete = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: 'delete' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const test__ = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const test__$ = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put', 'delete'] })
`)
})
