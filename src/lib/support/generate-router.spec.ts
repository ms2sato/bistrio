import { blankSchema } from '../shared/schemas.js'
import { GenerateRouter } from './generate-router.js'

test('resources', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/build', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'test_resource__build',
    method: 'get',
    link: '/test/build',
    optionNames: [],
  })
  expect(router.links.unnamed[0]).toEqual({ name: 'test__build', method: 'get', link: '/test/build', optionNames: [] })
  expect(router.generateNamedEndpoints())
    .toEqual(`export const test_resource__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const get__test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`)
})

test('resources with options', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/$id', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'test_resource__build',
    method: 'get',
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })
  expect(router.links.unnamed[0]).toEqual({
    name: 'test__$__$',
    method: 'get',
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })

  expect(router.generateNamedEndpoints())
    .toEqual(`export const test_resource__build = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const get__test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)
})

test('pages', () => {
  const router = new GenerateRouter()

  router.pages('/test', ['build'])

  expect(router.links.unnamed[0]).toEqual({ name: 'test__build', method: 'get', link: '/test/build', optionNames: [] })
  expect(router.generateUnnamedEndpoints()).toEqual(
    `export const get__test__build = Object.freeze({ path: () => { return \`/test/build\` }, method: 'get' })
`,
  )
})

test('pages with options', () => {
  const router = new GenerateRouter()

  router.pages('/test/$testId', ['$id'])

  expect(router.links.unnamed[0]).toEqual({
    name: 'test__$__$',
    method: 'get',
    link: '/test/${testId}/${id}',
    optionNames: ['testId', 'id'],
  })
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const get__test__$__$ = Object.freeze({ path: ({ testId, id }: { testId: string|number, id: string|number }) => { return \`/test/\${testId}/\${id}\` }, method: 'get' })
`)
})

test('multiple', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'test_resource',
    actions: [
      { action: 'create', method: 'post', path: '/' },
      { action: 'update', method: ['patch', 'put'], path: '/$id' },
    ],
    construct: { create: { schema: blankSchema }, update: { schema: blankSchema } },
  })

  expect(router.links.named[0]).toEqual({
    name: 'test_resource__create',
    method: 'post',
    link: '/test/',
    optionNames: [],
  })
  expect(router.links.unnamed[0]).toEqual({ name: 'test__', method: 'post', link: '/test/', optionNames: [] })
  expect(router.generateNamedEndpoints())
    .toEqual(`export const test_resource__create = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const test_resource__update = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: ['patch', 'put'] })
`)
  expect(router.generateUnnamedEndpoints())
    .toEqual(`export const post__test__ = Object.freeze({ path: () => { return \`/test/\` }, method: 'post' })
export const patch__test__$ = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: 'patch' })
export const put__test__$ = Object.freeze({ path: ({ id }: { id: string|number }) => { return \`/test/\${id}\` }, method: 'put' })
`)
})
