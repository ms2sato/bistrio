import createDebug from 'debug'
import http from 'node:http'
import type express from 'express'

export function boot(app: express.Application) {
  const debug = createDebug('bistrio:server')

  /**
   * Get port from environment and store in Express.
   */

  const port = normalizePort(process.env.PORT || '3000')
  app.set('port', port)

  /**
   * Create HTTP server.
   */

  const server = http.createServer(app)

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port)
  server.on('error', onError)
  server.on('listening', onListening)

  /**
   * Normalize a port into a number, string, or false.
   */

  function normalizePort(val: string) {
    const port = parseInt(val, 10)

    if (isNaN(port)) {
      // named pipe
      return val
    }

    if (port >= 0) {
      // port number
      return port
    }

    return false
  }

  /**
   * Event listener for HTTP server "error" event.
   */

  type ServerError = {
    syscall: string
    code: string
  }

  function onError(error: ServerError) {
    if (error.syscall !== 'listen') {
      throw error
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : `Port ${port.toString()}`

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges')
        process.exit(1)
        break
      case 'EADDRINUSE':
        console.error(bind + ' is already in use')
        process.exit(1)
        break
      default:
        throw error
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening() {
    const addr = server.address()
    if (typeof addr === 'string') {
      debug('pipe ' + addr)
    } else {
      debug('access http://localhost:%s', addr?.port)
    }
  }
}
