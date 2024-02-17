import { join } from 'node:path'

import { asURL } from '../../support'
import { spy, RequestHolder, waitForAnyInnerText } from '../../support/request-spy'
import { signIn, signOut } from '../../support/helper'
import { getPrismaClient } from '../../../server/lib/prisma-util'

const prisma = getPrismaClient()

beforeAll(async () => await signIn('admin', 'password'))
afterAll(async () => await signOut())

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { username: { not: { in: ['admin', 'user1', 'user2'] } } } })
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { username: { not: { in: ['admin', 'user1', 'user2'] } } } })
})

describe('senario /admin/users', () => {
  let req: RequestHolder

  beforeAll(async () => {
    req = spy(page)
    await page.goto(asURL('admin/users'))
  })

  test('senario', async () => {
    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Admin/Users')
    await expect(page.content()).resolves.toMatch('admin')
    await expect(page.content()).resolves.toMatch('user1')
    await expect(page.content()).resolves.toMatch('user2')

    const fileEl = await page.$('input[type=file]')
    if (!fileEl) throw new Error('fileEl is null')

    await fileEl.uploadFile(join(__dirname, '../../fixtures/users.ndjson'))
    await page.screenshot()
    await Promise.all([req.clearAndWaitForResponses(1, { resourceType: 'ajax' }), page.click('[type=submit]')])

    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'POST' })).toHaveLength(1)

    await waitForAnyInnerText(page, 'td', 'test1')

    await expect(page.content()).resolves.toMatch('test1')
    await expect(page.content()).resolves.toMatch('test2')
    await expect(page.content()).resolves.toMatch('test3')
    await expect(page.content()).resolves.toMatch('test4')
    await expect(page.content()).resolves.toMatch('test5')
  })
})
