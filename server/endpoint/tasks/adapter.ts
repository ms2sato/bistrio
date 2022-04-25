import { defineAdapter, AdapterOf, Handler } from 'restrant2'
import type resource from './resource'

type Adapter = AdapterOf<typeof resource> & { build: Handler }

export default defineAdapter((_support, _options): Adapter => {
  return {
    index: {
      success: (ctx, output) => ctx.render('tasks/index', { tasks: output }),
    },

    build: (ctx) => ctx.render('tasks/build', { task: {} }),

    edit: {
      success: (ctx, output) => ctx.render('tasks/edit', { task: output }),
    },

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
  }
})
