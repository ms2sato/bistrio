import { blankSchema } from "../shared/schemas.js"
import { GenerateRouter } from "./generate-router.js"

test('resources', () => {
  const router = new GenerateRouter()

  router.resources('/test', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/build', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.test_resource_build).toEqual({ link: '/test/build', optionNames: [] })
})

test('resources with options', () => {
  const router = new GenerateRouter()

  router.resources('/test/$testId', {
    name: 'test_resource',
    actions: [{ action: 'build', method: 'get', path: '/$id', page: true }],
    construct: { build: { schema: blankSchema } },
  })

  expect(router.links.test_resource_build).toEqual({ link: '/test/$testId/$id', optionNames: ['testId', 'id'] })
})

test('pages', () => {
  const router = new GenerateRouter()

  router.pages('/test', ['build'])
  console.log(router.links)

  expect(router.links.test_build).toEqual({ link: '/test/build', optionNames: [] })
})

test('pages with options', () => {
  const router = new GenerateRouter()

  router.pages('/test/$testId', ['$id'])
  console.log(router.links)

  expect(router.links.test_$testId_$id).toEqual({ link: '/test/$testId/$id', optionNames: ['testId', 'id'] })
})
