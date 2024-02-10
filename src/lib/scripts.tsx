import { join } from 'node:path'
import { ActionContext, ScriptProps, generateScripts } from '../index.js'
import isObject from 'is-object'
import { ExtendedServerResponse } from 'webpack-dev-middleware'

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

function normalizeAssets(assets: unknown): string[] {
  if (isObject(assets)) {
    return Object.values(assets) as string[]
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (Array.isArray(assets) ? assets : [assets]) as string[]
}

export function Scripts({ hydrate, type = 'module', ...props }: ScriptProps): JSX.Element {
  if (!hydrate) {
    return <></>
  }

  const scripts = generateScripts(props)

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: cacheScripts,
        }}
      />
      {scripts.map((js) => {
        return <script key={js} src={js} defer type={type}></script>
      })}
    </>
  )
}

export function DevScripts({ ctx, hydrate, type = 'module', script }: ScriptProps & { ctx: ActionContext }) {
  if (!hydrate) {
    return <></>
  }

  const entries = script instanceof Array ? script : [script]

  const res = ctx.res as ExtendedServerResponse
  const { devMiddleware } = res.locals!.webpack!
  const outputFileSystem = devMiddleware!.outputFileSystem
  const jsonWebpackStats = devMiddleware!.stats!.toJson()

  const assetsByChunkName = jsonWebpackStats.assetsByChunkName || {}
  const outputPath = jsonWebpackStats.outputPath
  if (!outputPath) {
    throw new Error('outputPath is not defined')
  }

  return (
    <>
      {entries.length && (
        <style>
          {entries.map((entry) =>
            normalizeAssets(assetsByChunkName[entry])
              .filter((filePath) => filePath.endsWith('.css'))
              .map((filePath) => outputFileSystem.readFileSync!(join(outputPath, filePath)))
              .join('\n'),
          )}
        </style>
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: cacheScripts,
        }}
      />
      {entries.map((entry) =>
        normalizeAssets(assetsByChunkName[entry])
          .filter((filePath) => filePath.endsWith('.js'))
          .map((filePath) => <script key={filePath} src={`/${filePath}`} type={type} defer></script>),
      )}
    </>
  )
}
