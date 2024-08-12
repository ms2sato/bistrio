import { createServer, IncomingMessage, RequestListener, ServerResponse } from 'node:http'

export function createHttpServer<
  Request extends typeof IncomingMessage = typeof IncomingMessage,
  Response extends typeof ServerResponse = typeof ServerResponse,
>(app: RequestListener<Request, Response>, port: number | string) {
  /**
   * Create HTTP server.
   */

  const server = createServer(app)

  server.on('error', onError)
  server.on('listening', onListening)

  /**
   * Event listener for HTTP server "error" event.
   */

  type ServerError = {
    syscall: string
    code: string
  }

  function onError(error: ServerError) {
    if (error.syscall !== 'listen') {
      throw new Error(JSON.stringify(error))
    }

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`${port} requires elevated privileges`)
        process.exit(1)
        break
      case 'EADDRINUSE':
        console.error(`${port} is already in use`)
        process.exit(1)
        break
      default:
        throw new Error(JSON.stringify(error))
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening() {
    const addr = server.address()
    if (typeof addr === 'string') {
      console.log('pipe ' + addr)
    } else {
      console.log('access http://localhost:%s', addr?.port)
    }
  }

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port)

  return server
}
