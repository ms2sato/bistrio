export type Template = { raw: readonly string[] | ArrayLike<string> }
export type LocaleTagFunc = (template: Template, ...values: unknown[]) => string
export type LocaleSelector = {
  select: (lang: string) => Localizer
  getLanguages: () => string[]
}

export type Localizer = {
  t: LocaleTagFunc
  o: (key: string, ...values: unknown[]) => string
}
