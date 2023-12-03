import { lazy } from 'react'
export const loadPage = (pagePath: string) => {
  return lazy(() =>
    import(/*webpackChunkName: "[request]" */ `../../universal/pages${pagePath}`).then(({ Page }) => ({
      default: Page,
    })),
  )
}
