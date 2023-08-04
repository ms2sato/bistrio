import { type RequestHandler } from 'express'

export const checkLoggedIn = (): RequestHandler => {
  return (req, res, next) => {
    console.log('checkLoggedIn!', req.user)
    next()
  }
}

export const checkAdmin = (): RequestHandler => {
  return (req, res, next) => {
    console.log('checkAdmin!', req.user)
    next()
  }
}
