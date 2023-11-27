import express from 'express'
import { LocaleSelector } from './shared/locale.js'
import { initLocale, LocaleDictionary } from './shared/localizer.js'

let localeSelector: LocaleSelector

type localeMiddlewareProps<LM extends Record<string, LocaleDictionary>> = {
  defaultLanguage: string
  localeMap: LM
}

export const localeMiddleware = <LM extends Record<string, LocaleDictionary>>({
  defaultLanguage,
  localeMap,
}: localeMiddlewareProps<LM>) => {
  localeSelector = initLocale(localeMap)

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // TODO: any approch for detect language
      const lang = req.acceptsLanguages(localeSelector.getLanguages()) || defaultLanguage
      req.localizer = localeSelector.select(lang)

      next()
    } catch (err) {
      next(err)
    }
  }
}
