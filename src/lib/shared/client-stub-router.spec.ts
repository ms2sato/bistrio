import { createPath } from '.'

test('None changes for without placeholder', () => {
  const ret = createPath('/api', '/test/abc', {})
  expect(ret.httpPath).toEqual('/api/test/abc')
  expect(ret.keys).toEqual([])
})

test('replace success for :id on pathFormat', () => {
  const ret = createPath('/api', '/test/:id', { id: 3 })
  expect(ret.httpPath).toEqual('/api/test/3')
  expect(ret.keys).toEqual(['id'])
})

test('replace success for multi placeholders on pathFormat', () => {
  const ret = createPath('/api', '/parent/:parentId/test/:id', { parentId: 5, id: 3 })
  expect(ret.httpPath).toEqual('/api/parent/5/test/3')
  expect(ret.keys).toEqual(['parentId', 'id'])
})

test('replace success for a placeholder on resourceUrl', () => {
  const ret = createPath('/api/parent/:parentId/', 'test/:id', { parentId: 5, id: 3 })
  expect(ret.httpPath).toEqual('/api/parent/5/test/3')
  expect(ret.keys).toEqual(['parentId', 'id'])
})
