import { asURL } from '.'
import { waitForAnyInnerText } from './request-spy'

export const signIn = async (username: string, password: string) => {
  await page.goto(asURL('auth/login'))
  await page.type('input[name=username]', username)
  await page.type('input[name=password]', password)
  await page.click('button[type="submit"]')
  await waitForAnyInnerText(page, 'header a', 'Logout')
}

export const signOut = async () => {
  await page.goto(asURL(''))
  await page.click('#logout')
  await waitForAnyInnerText(page, 'h1', 'Sign in')
}
