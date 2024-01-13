import { Task } from '@prisma/client'
import { getPrismaCilent } from '../../server/lib/prisma-util'
import { asURL } from '../support'
import { spy, RequestHolder, waitForAnyInnerText, waitForNotAnyInnerText } from '../support/request-spy'
import { signIn, signOut } from '../support/helper'

const prisma = getPrismaCilent()

beforeAll(async () => await signIn('user1', 'password'))
afterAll(async () => await signOut())

describe('senario /tasks', () => {
  let req: RequestHolder

  beforeAll(async () => {
    req = spy(page)
    await page.goto(asURL('tasks')) // Index
  })

  test('senario', async () => {
    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')

    await page.click('a[href="/tasks/build"]') // Build CSR(wait for loading view)
    await page.waitForSelector('textarea[name=description]')

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Create new task')
    await page.type('input[name=title]', 'TestTitle')
    await page.type('textarea[name=description]', 'TestDescription')

    // Create Ajax
    await Promise.all([req.clearAndWaitForResponses(3, { resourceType: 'ajax' }), page.click('input[type="submit"]')])

    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'POST', url: asURL('tasks/') })).toHaveLength(1)
    expect(
      req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('tasks.json?page=1&limit=5') }),
    ).toHaveLength(1)

    await page.waitForSelector('tbody')

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.$eval('h1', (el) => (el as HTMLTitleElement).innerText)).resolves.toMatch('Task list')
    await expect(page.content()).resolves.toMatch('Undone')
    await expect(page.content()).resolves.toMatch('TestTitle')
    await expect(page.content()).resolves.toMatch('TestDescription')
    // Done Ajax
    await Promise.all([
      req.clearAndWaitForResponses(1, { resourceType: 'ajax' }),
      page.click('tbody tr:first-child td:nth-child(2) a'),
    ])

    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'POST' })).toHaveLength(1)

    await waitForAnyInnerText(page, 'td', 'TestDescription')

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.$eval('h1', (el) => (el as HTMLTitleElement).innerText)).resolves.toMatch('Task list')
    await expect(page.content()).resolves.toMatch('Done')
    await expect(page.content()).resolves.toMatch('TestTitle')
    await expect(page.content()).resolves.toMatch('TestDescription')

    await Promise.all([
      page.click('tbody tr:first-child td:nth-child(5) a:first-child'), // Edit CSR
      page.waitForSelector('textarea[name=description]'),
    ])

    await expect(page.content()).resolves.toMatch('TestTitle')
    await expect(page.content()).resolves.toMatch('TestDescription')

    await page.$eval('input[name=title]', (el) => ((el as HTMLInputElement).value = 'll')) // for overwrite all text
    await page.$eval('textarea[name=description]', (el) => ((el as HTMLTextAreaElement).value = '')) // for overwrite all text

    await Promise.all([
      page.click('input[type="submit"]'), // Update(validation error) CSR
      page.waitForSelector('ul li'),
    ])

    await expect(page.content()).resolves.toMatch('title: String must contain at least 3 character(s)')

    await page.$eval('input[name=title]', (el) => ((el as HTMLInputElement).value = 'NewTitle')) // for overwrite all text
    await page.$eval('textarea[name=description]', (el) => ((el as HTMLTextAreaElement).value = 'NewDescription')) // for overwrite all text

    // Update CSR + Ajax
    await Promise.all([req.clearAndWaitForResponses(1, { resourceType: 'ajax' }), page.click('input[type="submit"]')])

    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'PUT' })).toHaveLength(1)

    await waitForAnyInnerText(page, 'td', 'NewTitle')

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    await expect(page.content()).resolves.toMatch('Done')
    await expect(page.content()).resolves.toMatch('NewTitle')
    await expect(page.content()).resolves.toMatch('NewDescription')
    // Delete
    await Promise.all([
      req.clearAndWaitForResponses(1, { resourceType: 'ajax' }),
      page.click('tbody tr:first-child td:nth-child(5) a:nth-child(2)'),
    ])

    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'DELETE' })).toHaveLength(1)

    await waitForNotAnyInnerText(page, 'td', 'NewDescription')

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    await expect(page.content()).resolves.not.toMatch('NewTitle')
  })
})

describe('/tasks', () => {
  beforeAll(async () => {
    await prisma.task.createMany({
      data: [
        { title: 'Test1', description: 'Description1', done: false },
        { title: 'Test2', description: 'Description2', done: false },
        { title: 'Test3', description: 'Description3', done: false },
      ],
    })

    await page.goto(asURL('tasks'))
  })

  afterAll(async () => {
    await prisma.task.deleteMany()
  })

  it('returns task table', async () => {
    await waitForAnyInnerText(page, 'td', 'Description3')
    await expect(page.title()).resolves.toMatch('Tasks')
  })
})

describe('/tasks/build', () => {
  let req: RequestHolder

  beforeAll(async () => {
    req = spy(page)
    await page.goto(asURL('tasks/build'))
  })

  it('should be titled "Tasks"', async () => {
    await page.waitForSelector('body')
    expect(req.requested.where({ resourceType: 'ajax' })).toHaveLength(0)
    await expect(page.title()).resolves.toMatch('Tasks')
  })
})

describe('/tasks/:id/edit', () => {
  let req: RequestHolder
  let task: Task

  beforeAll(async () => {
    task = await prisma.task.create({ data: { title: 'Test1', description: 'Description1', done: false } })
    req = spy(page)
  })

  afterAll(async () => {
    await prisma.task.deleteMany()
  })

  beforeEach(async () => {
    await page.goto(asURL(`tasks/${task.id}/edit`))
  })

  afterEach(() => {
    req.clear()
  })

  it('returns Task edit view', async () => {
    await page.waitForSelector('textarea[name=description]')
    await expect(page.title()).resolves.toMatch('Tasks')

    await expect(page.content()).resolves.toMatch('Test1')
    await expect(page.content()).resolves.toMatch('Description1')
  })

  it('updates done status', async () => {
    // show edit view
    await page.waitForSelector('input[name=done]')

    const checked = await page.$eval('input[name=done]', (el) => (el as HTMLInputElement).checked)
    expect(checked).toBeFalsy()

    // input new data and submit
    await page.click('input[name=done]')
    await page.type('input[name=title]', 'NewTitle')
    await Promise.all([req.clearAndWaitForResponses(3, { resourceType: 'ajax' }), page.click('input[type=submit]')])

    // show index view
    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'PUT' })).toHaveLength(1)
    expect(
      req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('tasks.json?page=1&limit=5') }),
    ).toHaveLength(1)

    // check updated values
    await waitForAnyInnerText(page, 'td', 'Done')
    await expect(page.content()).resolves.toMatch('NewTitle')
  })
})

describe('/tasks/:id', () => {
  let req: RequestHolder
  let task: Task

  beforeAll(async () => {
    task = await prisma.task.create({ data: { title: 'Test1', description: 'Description1', done: false } })
    req = spy(page)
  })

  afterAll(async () => {
    await prisma.comment.deleteMany()
    await prisma.task.deleteMany()
  })

  beforeEach(async () => {
    await page.goto(asURL(`tasks/${task.id}`))
  })

  afterEach(() => {
    req.clear()
  })

  it('returns Task view', async () => {
    await waitForAnyInnerText(page, 'div', 'Description1')
    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Test1')
  })

  it('post comment', async () => {
    await waitForAnyInnerText(page, 'div', 'Description1')
    await page.type('input[name=body]', 'TestComment')

    await Promise.all([req.clearAndWaitForResponses(4, { resourceType: 'ajax' }), page.click('input[type=submit]')])

    expect(req.ok).toBe(true)
    expect(req.finished.where({ resourceType: 'ajax', method: 'POST' })).toHaveLength(1)
    expect(
      req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL(`tasks/${task.id}.json`) }),
    ).toHaveLength(1)
    expect(
      req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL(`tasks/${task.id}/comments.json`) }),
    ).toHaveLength(1)

    await waitForAnyInnerText(page, 'li', 'TestComment')
  })
})
