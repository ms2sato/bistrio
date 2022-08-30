import { asURL, extend, RequestHolder } from '../support'

describe('senario /tasks', () => {
  let req: RequestHolder

  beforeAll(async () => {
    req = extend(page)
    await page.goto(asURL('tasks')) // Index SSR + Ajax
  })

  test('senario', async () => {
    await req.waitForResponses(1, { resourceType: 'ajax' })
    expect(req.errors).toHaveLength(0)
    expect(req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('api/tasks/') })).toHaveLength(1)

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    req.clear()
    await page.click('a[href="/tasks/build"]') // Build CSR(not for wait)

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Create new task')
    await page.$eval('input[name=title]', (el) => ((el as HTMLInputElement).value = 'TestTitle'))
    await page.$eval('textarea[name=description]', (el) => ((el as HTMLInputElement).value = 'TestDescription'))
    req.clear()
    await page.click('input[type="submit"]') // Create SSR + Ajax

    await req.waitForResponses(1, { resourceType: 'ajax' })
    expect(req.errors).toHaveLength(0)
    expect(req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('api/tasks/') })).toHaveLength(1)

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    await expect(page.content()).resolves.toMatch('Undone')
    await expect(page.content()).resolves.toMatch('TestTitle')
    await expect(page.content()).resolves.toMatch('TestDescription')
    req.clear()
    await page.click('tbody tr:first-child td:nth-child(2) a') // Done SSR + Ajax

    await req.waitForResponses(1, { resourceType: 'ajax' })
    expect(req.errors).toHaveLength(0)
    expect(req.finished.where({ resourceType: 'ajax', method: 'GET' })).toHaveLength(1)

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    await expect(page.content()).resolves.toMatch('Done')
    await expect(page.content()).resolves.toMatch('TestTitle')
    await expect(page.content()).resolves.toMatch('TestDescription')
    req.clear()
    await page.click('tbody tr:first-child td:nth-child(5) a:first-child') // Edit SSR

    await page.waitForSelector('form')
    await expect(page.content()).resolves.toMatch('TestTitle')
    await expect(page.content()).resolves.toMatch('TestDescription')

    await page.$eval('input[name=title]', (el) => ((el as HTMLInputElement).value = 'll'))
    await page.$eval('textarea[name=description]', (el) => ((el as HTMLInputElement).value = ''))
    req.clear()
    await page.click('input[type="submit"]') // Update(validation error redirect) SSR

    await page.waitForSelector('ul li')
    await expect(page.content()).resolves.toMatch('String must contain at least 3 character(s)')
    await expect(page.content()).resolves.toMatch('Expected string, received null')
    await expect(page.content()).resolves.toMatch('ll')

    await page.$eval('input[name=title]', (el) => ((el as HTMLInputElement).value = 'NewTitle'))
    await page.$eval('textarea[name=description]', (el) => ((el as HTMLInputElement).value = 'NewDescription'))
    req.clear()
    await page.click('input[type="submit"]') // Update SSR + Ajax

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    await expect(page.content()).resolves.toMatch('Done')
    await expect(page.content()).resolves.toMatch('NewTitle')
    await expect(page.content()).resolves.toMatch('NewDescription')
    req.clear()
    await page.click('tbody tr:first-child td:nth-child(5) a:nth-child(2)') // Delete SSR

    await req.waitForResponses(1, { resourceType: 'ajax' })
    expect(req.errors).toHaveLength(0)
    // FIXME: toHaveLength(2)
    // expect(req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('api/tasks/') })).toHaveLength(1)

    await expect(page.title()).resolves.toMatch('Tasks')
    await expect(page.content()).resolves.toMatch('Task list')
    await expect(page.content()).resolves.not.toMatch('NewTitle')
  })
})

// describe('/tasks', () => {
//   let req: RequestHolder

//   beforeAll(async () => {
//     req = extend(page)
//     await page.goto(asURL('tasks'))
//   })

//   it('should be titled "Tasks"', async () => {
//     await page.waitForSelector('table') // wait for suspense
//     expect(req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('api/tasks/') })).toHaveLength(1)
//     await expect(page.title()).resolves.toMatch('Tasks')
//   })
// })

// describe('/tasks/build', () => {
//   let req: RequestHolder

//   beforeAll(async () => {
//     req = extend(page)
//     await page.goto(asURL('tasks/build'))
//   })

//   it('should be titled "Tasks"', async () => {
//     await page.waitForSelector('body')
//     expect(req.requested.where({ resourceType: 'ajax'})).toHaveLength(0)
//     await expect(page.title()).resolves.toMatch('Tasks')
//   })
// })
