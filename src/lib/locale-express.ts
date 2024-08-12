import express from 'express'
import { LocaleSelector } from './shared/locale.js'
import { initLocale, LocaleDictionary } from './shared/localizer.js'

let localeSelector: LocaleSelector

type localeMiddlewareProps<LM extends Record<string, LocaleDictionary>> = {
  defaultLanguage: string
  localeMap: LM
  choiceLanguage?: ChoiceLanguageFunc
}

type ChoiceLanguageFunc = ({
  req,
  localeSelector,
  defaultLanguage,
}: {
  req: express.Request
  localeSelector: LocaleSelector
  defaultLanguage: string
}) => string

export const choiceLanguageByAcceptLanguage: ChoiceLanguageFunc = ({ req, localeSelector, defaultLanguage }) =>
  req.acceptsLanguages(localeSelector.getLanguages()) || defaultLanguage

export const choiceDefaultLanguage: ChoiceLanguageFunc = ({ defaultLanguage }) => defaultLanguage

export const localeMiddleware = <LM extends Record<string, LocaleDictionary>>({
  defaultLanguage,
  localeMap,
  choiceLanguage = choiceLanguageByAcceptLanguage,
}: localeMiddlewareProps<LM>) => {
  localeSelector = initLocale(localeMap)

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // TODO: any approch for detect language
      const lang = choiceLanguage({ req, localeSelector, defaultLanguage })
      res.locals.lang = lang
      req.localizer = localeSelector.select(lang)

      next()
    } catch (err) {
      next(err)
    }
  }
}
