import { type RequestHandler } from 'express'

export const checkLoggedIn = (): RequestHandler => {
  return (req, res, next) => {
    console.log('checkLoggedIn!')
    next()
  }
}

export const checkAdmin = (): RequestHandler => {
  return (req, res, next) => {
    console.log('checkAdmin!')
    next()
  }
}
