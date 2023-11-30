import { asURL } from '.'
import { waitForAnyInnerText } from './request-spy'

export const signIn = async (username: string, password: string) => {
  await page.goto(asURL('auth/login'))
  await page.type('input[name=username]', username)
  await page.type('input[name=password]', password)
  await page.click('button[type="submit"]')
  await waitForAnyInnerText(page, 'header a', 'Logout')
}
