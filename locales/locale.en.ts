export default () => ({
  Hello: true,
  'Task list': true,
  'Create new task': true,
  'There are @ errors': true,
  'There are @ errors on @ page': true,
  models: {
    tasks: {
      done: 'DoneStatus',
      getStatus: (done: boolean) => (done ? 'Done' : 'Undone'),
    },
  },
})
