import { defineAdapter, AdapterOf } from 'restrant2'
import type resource from './resource'

type Adapter = AdapterOf<typeof resource>

export default defineAdapter<Adapter>((_support, _options) => ({
  create: {
    success: (ctx, _output) => {
      ctx.redirect('/tasks')
    },
    invalid: (ctx, err, source) => {
      ctx.render('tasks/build', { task: source, err })
    },
  },

  update: {
    success: (ctx, _output) => {
      ctx.redirect('/tasks')
    },
    invalid: (ctx, err, source) => {
      ctx.render('tasks/edit', { task: source, err })
    },
  },

  destroy: {
    success: (ctx, _output) => {
      ctx.redirect('/tasks')
    },
  },

  done: {
    success: (ctx, _output) => {
      ctx.redirect('/tasks')
    },
  },
}))
