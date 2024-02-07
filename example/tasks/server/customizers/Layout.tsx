import { join } from 'node:path'
import { ReactNode } from 'react'
import { ActionContext, ScriptProps, Scripts } from 'bistrio'
import isObject from 'is-object'

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

function normalizeAssets(assets: unknown) {
  if (isObject(assets)) {
    return Object.values(assets) as string[]
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (Array.isArray(assets) ? assets : [assets]) as string[]
}

export function Layout({ children, ctx, hydrate }: { children: ReactNode; ctx: ActionContext; hydrate: boolean }) {
  // const script = ctx.req.originalUrl.startsWith('/admin') ? ['admin'] : ['main']
  // const scriptProps: ScriptProps = { hydrate, script }

  const res = ctx.res
  const { devMiddleware } = res.locals.webpack
  const outputFileSystem = devMiddleware.outputFileSystem
  const jsonWebpackStats = devMiddleware.stats.toJson()
  const { assetsByChunkName, outputPath } = jsonWebpackStats

  console.log('############ Layout')

  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/css/style.css"></link>
        <style>
          {normalizeAssets(assetsByChunkName.main)
            .filter((path) => path.endsWith('.css'))
            .map((path) => outputFileSystem.readFileSync(join(outputPath, path)))
            .join('\n')}
        </style>
        <script
          dangerouslySetInnerHTML={{
            __html: cacheScripts,
          }}
        />
        {normalizeAssets(assetsByChunkName.main)
          .filter((path) => path.endsWith('.js'))
          .map((path) => {
            console.log('############### js', path)
            return <script key={path} src={`/${path}`} type="module" defer></script>
          })}
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
