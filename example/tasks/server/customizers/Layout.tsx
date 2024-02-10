import { ReactNode } from 'react'
import { ActionContext, DevScripts, ScriptProps, Scripts } from 'bistrio'

export function Layout({ children, ctx, hydrate }: { children: ReactNode; ctx: ActionContext; hydrate: boolean }) {
  const script = ctx.req.originalUrl.startsWith('/admin') ? ['admin'] : ['main']
  const scriptProps: ScriptProps = { hydrate, script }

  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/css/style.css"></link>
        {process.env.NODE_ENV === 'development' && ctx.res.locals?.webpack ? (
          <DevScripts {...{ ctx, ...scriptProps }} />
        ) : (
          <Scripts {...scriptProps} />
        )}
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
