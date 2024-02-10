import { join } from 'node:path'
import isObject from 'is-object'
import { ExtendedServerResponse } from 'webpack-dev-middleware'
import { cacheScripts } from './scripts.js'
import { ScriptProps } from './webpack-client.js'
import { ActionContext } from './action-context.js'

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

function normalizeAssets(assets: unknown): string[] {
  if (isObject(assets)) {
    return Object.values(assets) as string[]
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (Array.isArray(assets) ? assets : [assets]) as string[]
}
