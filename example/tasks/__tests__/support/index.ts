import path from 'path'
import { Page } from 'puppeteer'

const URL = `http://localhost:${process.env.PORT ? Number(process.env.PORT) : 4569}`

export function asURL(httpPath: string) {
  return path.join(URL, httpPath)
}

export function extend(page: Page) {
  page.on('pageerror', (error) => {
    console.error('[Error]pageerror', error)
  })

  page.on('request', (request) => {
    console.debug('request', request.url())
  })

  page.on('requestfinished', (request) => {
    console.debug('requestfinished', request)
  })

  page.on('requestfailed', (request) => {
    console.error('[Error]requestfailed', request.url(), request)
  })
}
