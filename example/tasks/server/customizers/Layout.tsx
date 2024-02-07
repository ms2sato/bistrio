import { ReactNode } from 'react'
import { ActionContext, ScriptProps, Scripts } from 'bistrio'

const cacheScripts = `
const isClient = typeof window !== 'undefined'
if (isClient && !window.BISTRIO) {
  window.BISTRIO = {
    cache: {},
    addCache(record) {
      this.cache[record.key] = record.data
    },
  }
}
`

export function Layout({ children, ctx, hydrate }: { children: ReactNode; ctx: ActionContext; hydrate: boolean }) {
  const script = ctx.req.originalUrl.startsWith('/admin') ? ['admin'] : ['main']
  const scriptProps: ScriptProps = { hydrate, script }

  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/css/style.css"></link>
        <script
          dangerouslySetInnerHTML={{
            __html: cacheScripts,
          }}
        />

        <script src="/main.bundle.js" type="module"></script>
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
