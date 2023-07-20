import { ReactNode } from 'react'
import { Livereload, ScriptProps, Scripts } from 'bistrio'

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
