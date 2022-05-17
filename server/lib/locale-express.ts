import express from 'express'
import { LocaleSelector } from '../../lib/locale'
import { initLocale } from '../../lib/localizer'

let localeSelector: LocaleSelector

type localeMiddlewareProps = {
  defaultLanguage: string
}

export const localeMiddleware = async (props: localeMiddlewareProps = { defaultLanguage: 'en' }) => {
  localeSelector = await initLocale()

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const lang = req.acceptsLanguages(localeSelector.getLanguages()) || props.defaultLanguage
      req.localizer = localeSelector.select(lang)

      next()
    } catch (err) {
      next(err)
    }
  }
}
