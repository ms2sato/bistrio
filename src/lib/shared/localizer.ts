import { Localizer, Template, LocaleSelector } from './locale'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocaleItemFunc = (...args: any[]) => string

type LocaleDictionaryItem = string | LocaleItemFunc | boolean | LocaleDictionary

export type LocaleDictionary = {
  [key: string]: LocaleDictionaryItem
}

type ParentLocaleDictionary = {
  [key: string]: ParentLocaleDictionary
}

export class LocalizerImpl implements Localizer {
  constructor(private dictionary: LocaleDictionary, private lang: string) {}

  t(template: Template, ...values: unknown[]): string {
    const key = Array.prototype.join.call(template.raw, '@')
    const lfunc = this.dictionary[key]
    if (lfunc === undefined) {
      throw new Error(`Template not found: ${key} for locale: ${this.lang}`)
    }

    if (lfunc === true) {
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

  o(key: string, ...values: unknown[]): string {
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

    // TODO remove as unknown
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

export const initLocale = <LM extends Record<string, LocaleDictionary>>(localeMap: LM): LocaleSelector => {
  const select = (lang: string) => {
    const delimAt = lang.indexOf('-')
    const dictionary = localeMap[delimAt === -1 ? lang : lang.substring(0, delimAt)]
    if (dictionary == undefined) {
      throw new Error(`Unexpected locale: ${lang}`)
    }

    return new LocalizerImpl(dictionary, lang)
  }

  const getLanguages = () => Object.keys(localeMap)

  return {
    select,
    getLanguages,
  }
}
