import { defineHandlers } from 'restrant2'

export default defineHandlers((support, options) => {
  return {
    index: {
      success: async (output, req, res) => res.render('tasks/index', { tasks: output }),
    },

    build: (req, res) => res.render('tasks/build', { task: {} }),

    edit: {
      success: async (output, req, res) => res.render('tasks/edit', { task: output }),
    },

    create: {
      success: async (output, req, res) => {
        res.redirect('/tasks')
      },
      invalid: async (err, req, res) => {
        res.render('tasks/build', { task: req.body, err })
      },
    },

    update: {
      success: async (output, req, res) => {
        res.redirect('/tasks')
      },
      invalid: async (err, req, res) => {
        res.render('tasks/edit', { task: req.body, err })
      },
    },

    destroy: {
      success: async (output, req, res) => {
        res.redirect('/tasks')
      },
    },

    done: {
      success: async (output, req, res) => {
        res.redirect('/tasks')
      },
    },
  }
})
