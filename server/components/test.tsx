import 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { ActionContext } from 'restrant2'

function Test() {
  return <div>ABCEF</div>
}

function All() {
  return (
    <html>
      <body>
        <Test></Test>
      </body>
    </html>
  )
}

export async function render(ctx: ActionContext) {
  let didError = false
  const res = ctx.res
  const stream = renderToPipeableStream(<All></All>, {
    onShellReady() {
      // The content above all Suspense boundaries is ready.
      // If something errored before we started streaming, we set the error code appropriately.
      res.statusCode = didError ? 500 : 200
      res.setHeader('Content-type', 'text/html')
      stream.pipe(res)
    },
    onShellError(error) {
      // Something errored before we could complete the shell so we emit an alternative shell.
      res.statusCode = 500
      res.send('<!doctype html><p>Loading...</p><script src="clientrender.js"></script>')
    },
    onAllReady() {
      // If you don't want streaming, use this instead of onShellReady.
      // This will fire after the entire page content is ready.
      // You can use this for crawlers or static generation.
      // res.statusCode = didError ? 500 : 200;
      // res.setHeader('Content-type', 'text/html');
      // stream.pipe(res);
    },
    onError(err) {
      didError = true
      console.error(err)
    },
  })
}
