import { type Application } from 'express'
import { createHttpServer } from './create-http-server.js'

export function boot(app: Application) {
  /**
   * Get port from environment and store in Express.
   */

  const port = normalizePort(process.env.PORT || '3000')
  if (port === false) {
    throw new Error(`Invalid port: ${process.env.PORT || 'unknown'}`)
  }
  app.set('port', port)

  const server = createHttpServer(app, port)

  return server
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
  const port = Number(val)

  if (Number.isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}
