export default () => ({
  Hello: 'こんにちは',
  Edit: '編集',
  Delete: '削除',
  'Loading...': '読み込み中...',
  'Task list': 'タスク一覧',
  'Create new task': 'タスクの新規作成',
  'There are @ errors': (count: number) => `${count}個のエラーがあります`,
  'There are @ errors on @ page': (count: number, pageName: string) =>
    `${pageName}ページに${count}個のエラーがあります`,
  models: {
    tasks: {
      done: '完了状態',
      getStatus: (done: boolean) => (done ? '完了' : '未完'),
    },
  },
})
