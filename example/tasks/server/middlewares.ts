import { type RequestHandler } from 'express'

export const checkLoggedIn = (): RequestHandler => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      if (req.xhr && !req.originalUrl.startsWith('/api/auth')) {
        console.error('checkedLoggedIn! response 401')
        res.status(401).json({ message: 'Unauthorized' })
        return
      }

      if (!req.xhr && !req.originalUrl.startsWith('/auth')) {
        console.log('checkedLoggedIn! redirect to /auth/login')
        res.redirect('/auth/login') // TODO: for flash message
        return
      }
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
