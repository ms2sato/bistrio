import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { asURL } from '../support'
import { getPrismaCilent } from '../../server/lib/prisma-util'

const prisma = getPrismaCilent()

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { username: { not: { in: ['admin', 'user1', 'user2'] } } } })
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { username: { not: { in: ['admin', 'user1', 'user2'] } } } })
})

test('POST /api/users', async () => {
  const buffer = readFileSync(resolve(__dirname, '../fixtures/users.ndjson'))
  const res = await fetch(asURL('api/users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  })

  expect(res.ok).toBe(true)
  expect(await res.json()).toEqual({ status: 'success', data: { count: 5, error: [] } })

  const users = await prisma.user.findMany({
    where: { username: { not: { in: ['admin', 'user1', 'user2'] } } },
    orderBy: { id: 'asc' },
  })
  expect(users[0].username).toBe('test1')
  expect(users[1].username).toBe('test2')
  expect(users[2].username).toBe('test3')
  expect(users[3].username).toBe('test4')
  expect(users[4].username).toBe('test5')
})
