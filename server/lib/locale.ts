import path from 'path'
import * as glob from 'glob'
import createDebug from 'debug'

const log = createDebug('bistrio:locale')

export type LocaleConfig = {
  dir: string
}

export type LocaleTagFunc = (template: { raw: readonly string[] | ArrayLike<string> }, ...values: any[]) => string
export type LocaleSelector = {
  select: (lang: string) => LocaleTagFunc
  getLanguages: () => string[]
}

type LocaleItemFunc = (...args: any[]) => string
type LocaleDictionary = {
  [key: string]: string | LocaleItemFunc | true
}

export const initLocale = async ({ dir }: LocaleConfig): Promise<LocaleSelector> => {
  const lang2Dictionary: Map<string, LocaleDictionary> = new Map<string, LocaleDictionary>()
  const globExpression = `${dir}/locale.*.*`
  log('search locale files: %s', globExpression)

  const dictionaryPaths = glob.sync(globExpression, { ignore: [`${globExpression}.map`] })
  await Promise.all(
    dictionaryPaths.map(async (dictionaryPath) => {
      const lang = path.basename(dictionaryPath).split('.')[1]
      log('read dictionary: %s', lang)
      const module = (await import(dictionaryPath)) as { default: () => LocaleDictionary }
      const dictionary = module.default()
      lang2Dictionary.set(lang, dictionary)
    })
  )

  const select = (lang: string) => {
    const dictionary = lang2Dictionary.get(lang)
    if (dictionary == undefined) {
      throw new Error(`Unexpected locale: ${lang}`)
    }

    return (template: { raw: readonly string[] | ArrayLike<string> }, ...values: any[]) => {
      const key = Array.prototype.join.call(template.raw, '@')
      const lfunc = dictionary[key]
      if (lfunc === undefined) {
        throw new Error(`Template not found: ${key}`)
      }

      if (lfunc === true) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return String.raw(template, ...values)
      }

      if (typeof lfunc === 'string') {
        return lfunc
      }

      if (lfunc instanceof Function) {
        return lfunc.apply(dictionary, values)
      }

      throw new Error(`Unexpected type of : ${key}`)
    }
  }

  const getLanguages = () => Array.from(lang2Dictionary.keys())

  return {
    select,
    getLanguages,
  }
}
