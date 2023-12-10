import { blankSchema } from '../shared/schemas.js'
import { GenerateRouter } from './generate-router.js'

test('resources', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/build', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.named.test_resource__build).toEqual({ link: '/test/build', optionNames: [] })
  expect(router.links.path.test__build).toEqual({ link: '/test/build', optionNames: [] })
})

test('resources with options', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/$id', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.named.test_resource__build).toEqual({ link: '/test/$testId/$id', optionNames: ['testId', 'id'] })
  expect(router.links.path.test__$__$).toEqual({ link: '/test/$testId/$id', optionNames: ['testId', 'id'] })
})

test('pages', () => {
  const router = new GenerateRouter()

  router.pages('/test', ['build'])

  expect(router.links.path.test__build).toEqual({ link: '/test/build', optionNames: [] })
})

test('pages with options', () => {
  const router = new GenerateRouter()

  router.pages('/test/$testId', ['$id'])

  expect(router.links.path.test__$__$).toEqual({ link: '/test/$testId/$id', optionNames: ['testId', 'id'] })
})
