export default () => ({
  Hello: 'こんにちは',
  'There are @ errors': (count: number) => `${count}個のエラーがあります`,
  'There are @ errors on @ page': (count: number, pageName: string) =>
    `${pageName}ページに${count}個のエラーがあります`,
})
