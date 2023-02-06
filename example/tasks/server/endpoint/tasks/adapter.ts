import { defineAdapter, AdapterOf } from 'bistrio'
import type resource from './resource'

type Adapter = AdapterOf<typeof resource>

export default defineAdapter<Adapter>((_support, _options) => ({
  create: {
    success: (ctx, _output) => {
      ctx.redirect('/tasks')
    },
    invalid: (ctx, err, source) => {
      ctx.responseInvalid('/tasks/build', err, source)
    },
  },

  update: {
    success: (ctx, _output) => {
      ctx.redirect('/tasks')
    },
    invalid: (ctx, err, source) => {
      ctx.responseInvalid(`/tasks/${ctx.params.id}/edit`, err, source)
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
