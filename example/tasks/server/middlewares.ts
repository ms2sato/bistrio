import { type RequestHandler } from 'express'
import { auth$login } from '@bistrio/routes/main/named_endpoints'
import { Middlewares } from '@/universal/middlewares'

export const middlewares: Middlewares = {
  checkLoggedIn: (): RequestHandler => {
    return (req, res, next) => {
      if (!req.isAuthenticated()) {
        if (req.xhr) {
          console.error('checkedLoggedIn! response 401')
          res.status(401).json({ message: 'Unauthorized' })
        } else {
          console.log('checkedLoggedIn! redirect to /auth/login')
          res.redirect(auth$login.path()) // TODO: for flash message
        }
        return
      }

      next()
    }
  },

  checkAdmin: (): RequestHandler => {
    return (req, res, next) => {
      console.log('checkAdmin!', req.user)
      next()
    }
  },
}
