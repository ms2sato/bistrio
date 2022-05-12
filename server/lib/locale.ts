import path from 'path'
import * as glob from 'glob'
import createDebug from 'debug'

const log = createDebug('locale')

export type LocaleConfig = {
  dir: string
}

export type LocaleTagFunc = (template: Template, ...values: any[]) => string
export type LocaleSelector = {
  select: (lang: string) => Localizer
  getLanguages: () => string[]
}

type LocaleItemFunc = (...args: any[]) => string
type LocaleDictionaryItem = string | LocaleItemFunc | true
type LocaleDictionary = {
  [key: string]: LocaleDictionaryItem
}
type ParentLocaleDictionary = {
  [key: string]: ParentLocaleDictionary
}

export type Localizer = {
  t: LocaleTagFunc
  o: (key: string, ...values: any[]) => string
}

export type Template = { raw: readonly string[] | ArrayLike<string> }

export class LocalizerImpl implements Localizer {
  constructor(private dictionary: LocaleDictionary, private lang: string) {}

  t(template: Template, ...values: any[]): string {
    const key = Array.prototype.join.call(template.raw, '@')
    const lfunc = this.dictionary[key]
    if (lfunc === undefined) {
      throw new Error(`Template not found: ${key} for locale: ${this.lang}`)
    }

    if (lfunc === true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return String.raw(template, ...values)
    }

    if (typeof lfunc === 'string') {
      return lfunc
    }

    if (lfunc instanceof Function) {
      return lfunc.apply(this.dictionary, values)
    }

    throw new Error(`Unexpected type of ${key} for locale: ${this.lang}`)
  }

  o(key: string, ...values: any[]): string {
    const nodeNames = key.split('.')
    const lastNodeName = nodeNames.pop()
    if (lastNodeName === undefined) {
      throw new Error(`Unexpected key: "${key}" for locale: ${this.lang}`)
    }

    let node: ParentLocaleDictionary = this.dictionary as unknown as ParentLocaleDictionary
    for (const nodeName of nodeNames) {
      if (typeof node === 'string') {
        throw new Error(`Unexpected key: ${key} for locale: ${this.lang}`)
      }
      node = node[nodeName]
      if (!node) {
        throw new Error(`Node unmatch for locale: ${this.lang}`)
      }
    }

    const lfunc = (node as unknown as LocaleDictionary)[lastNodeName]

    if (lfunc === true) {
      throw new Error(`Unexpected value(true) of ${key} for locale: ${this.lang}`)
    }

    if (typeof lfunc === 'string') {
      return lfunc
    }

    if (lfunc instanceof Function) {
      return lfunc.apply(this.dictionary, values)
    }

    throw new Error(`Unexpected type of ${key} for locale: ${this.lang}`)
  }
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

    return new LocalizerImpl(dictionary, lang)
  }

  const getLanguages = () => Array.from(lang2Dictionary.keys())

  return {
    select,
    getLanguages,
  }
}
