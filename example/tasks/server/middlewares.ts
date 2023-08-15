import { type RequestHandler } from 'express'

export const checkLoggedIn = (): RequestHandler => {
  return (req, res, next) => {
    if (!req.isAuthenticated() && !req.originalUrl.startsWith('/auth/login')) {
      console.log('checkedLoggedIn! redirect to /auth/login')
      res.redirect('/auth/login') // TODO: for flash message
      return
    }

    next()
  }
}

export const checkAdmin = (): RequestHandler => {
  return (req, res, next) => {
    console.log('checkAdmin!', req.user)
    next()
  }
}
