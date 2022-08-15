import { asURL, extend } from '../support'

describe('/tasks', () => {
  beforeAll(async () => {
    extend(page)
    await page.goto(asURL('tasks'))
  })

  it('should be titled "Tasks"', async () => {
    await page.waitForSelector('table') // wait for suspense
    await expect(page.title()).resolves.toMatch('Tasks')
  })
})

describe('/tasks/build', () => {
  beforeAll(async () => {
    extend(page)
    await page.goto(asURL('tasks/build'))
  })

  it('should be titled "Tasks"', async () => {
    await page.waitForSelector('body')
    await expect(page.title()).resolves.toMatch('Tasks')
  })
})
