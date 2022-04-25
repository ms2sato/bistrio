import { defineAdapter, AdapterOf, Handler } from 'restrant2'
import type resource from './resource'

type Adapter = AdapterOf<typeof resource> & { build: Handler }

export default defineAdapter((support, options): Adapter => {
  return {
    index: {
      success: async (ctx, output) => ctx.render('tasks/index', { tasks: output }),
    },

    build: (ctx) => ctx.render('tasks/build', { task: {} }),

    edit: {
      success: async (ctx, output) => ctx.render('tasks/edit', { task: output }),
    },

    create: {
      success: async (ctx, output) => {
        ctx.redirect('/tasks')
      },
      invalid: async (ctx, err) => {
        ctx.render('tasks/build', { task: ctx.body, err })
      },
    },

    update: {
      success: async (ctx, output) => {
        ctx.redirect('/tasks')
      },
      invalid: async (ctx, err) => {
        ctx.render('tasks/edit', { task: ctx.body, err })
      },
    },

    destroy: {
      success: async (ctx, output) => {
        ctx.redirect('/tasks')
      },
    },

    done: {
      success: async (ctx, output) => {
        ctx.redirect('/tasks')
      },
    },
  }
})
