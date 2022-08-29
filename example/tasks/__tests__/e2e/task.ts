import { asURL, extend, RequestHolder } from '../support'

describe('senario /tasks', () => {
  let req: RequestHolder

  beforeAll(async () => {
    req = extend(page)
    await page.goto(asURL('tasks')) //SSR
  })

  test('senario', async () => {
    await req.waitForResponses(1, { resourceType: 'ajax' })

    expect(req.errors).toHaveLength(0)
    expect(req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('api/tasks/') })).toHaveLength(1)
    await expect(page.title()).resolves.toMatch('Tasks')
    req.clear()
    await page.click('a[href="/tasks/build"]') // CSR(not for wait)

    expect(req.requested.where({ resourceType: 'ajax' })).toHaveLength(0)
    await expect(page.title()).resolves.toMatch('Tasks')
    req.clear()

    await page.$eval('input[name=title]', (el) => ((el as HTMLInputElement).value = 'TestTitle'))
    await page.$eval('textarea[name=description]', (el) => ((el as HTMLInputElement).value = 'TestDescription'))
    await page.click('input[type="submit"]') // SSR

    await req.waitForResponses(1, { resourceType: 'ajax' })
    expect(req.errors).toHaveLength(0)
    expect(req.finished.where({ resourceType: 'ajax', method: 'GET', url: asURL('api/tasks/') })).toHaveLength(1)
    await expect(page.title()).resolves.toMatch('Tasks')
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
