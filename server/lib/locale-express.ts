import express from 'express'
import { initLocale, LocaleSelector, LocaleConfig } from './locale'

let localeSelector: LocaleSelector

type localeMiddlewareProps = {
  localeConfig: LocaleConfig
  defaultLanguage?: string
}

export const localeMiddleware = async ({ localeConfig, defaultLanguage = 'en' }: localeMiddlewareProps) => {
  localeSelector = await initLocale(localeConfig)

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const lang = req.acceptsLanguages(localeSelector.getLanguages()) || defaultLanguage
      req.localizer = localeSelector.select(lang)

      next()
    } catch (err) {
      next(err)
    }
  }
}
