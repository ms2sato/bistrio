import { ReactNode } from 'react'
import { ScriptProps, Scripts } from 'bistrio'

function Livereload() {
  if (process.env.NODE_ENV === 'production') {
    return <></>
  }

  const port = process.env.LIVERELOAD_PORT || 35729
  const origin = process.env.LIVERELOAD_ORIGIN || `http://' + (location.host || 'localhost').split(':')[0] + ':${port}`
  const src = `${origin}/livereload.js?snipver=1`
  const livereloadScript = `document.write('<script src="${src}" defer></' + 'script>')`

  return (
    <script
      defer
      dangerouslySetInnerHTML={{
        __html: livereloadScript,
      }}
    />
  )
}

export function Layout({ children, ...props }: { children: ReactNode } & ScriptProps) {
  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
        <Scripts {...props}></Scripts>
        <Livereload />
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
