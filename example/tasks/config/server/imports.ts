import { ComponentType, lazy } from 'react'
import { FileNotFoundError } from 'bistrio'

export async function importLocal(filePath: string) {
  try {
    return await import(/* webpackMode: "eager" */ `../../server/resources${filePath}`)
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

export function loadPage(filePath: string) {
  try {
    return lazy(async () => {
      const { Page } = await import(/* webpackMode: "eager" */ `../../universal/pages${filePath}`)
      return { default: Page as ComponentType<any> }
    })
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

