import { ReactNode } from 'react'
import { ActionContext, Livereload, ScriptProps, Scripts } from 'bistrio'

export function Layout({ children, ctx, hydrate }: { children: ReactNode; ctx: ActionContext; hydrate: boolean }) {
  const script = ctx.req.originalUrl.startsWith('/admin') ? ['admin'] : ['main']
  const scriptProps: ScriptProps = { hydrate, script }

  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
        <Scripts {...scriptProps}></Scripts>
        <Livereload />
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
