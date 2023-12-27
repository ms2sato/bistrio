import { type RequestHandler } from 'express'
import { auth$login } from '@bistrio/routes/all/named_endpoints'

export function checkLoggedIn(): RequestHandler {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      if (req.xhr) {
        console.error('checkedLoggedIn! response 401')
        res.status(401).json({ message: 'Unauthorized' })
        return
      }

      if (!req.xhr) {
        console.log('checkedLoggedIn! redirect to /auth/login')
        res.redirect(auth$login.path()) // TODO: for flash message
        return
      }
    }

    next()
  }
}

export function checkAdmin(): RequestHandler {
  return (req, res, next) => {
    console.log('checkAdmin!', req.user)
    next()
  }
}
