import { ScriptProps, Scripts } from 'bistrio'
import { ReactNode } from 'react'

export function Layout({ children, ...props }: { children: ReactNode } & ScriptProps) {
  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
        <Scripts {...props}></Scripts>
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
