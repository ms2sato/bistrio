import { ReactNode } from 'react'
import { ActionContext, Filemap, Livereload, StructureConfig, config } from 'bistrio'
import { readFileSync } from 'fs'
import path from 'path'

export type ScriptProps = GenerateScriptsProps & {
  hydrate: boolean
}

export type GenerateScriptsProps = {
  script: string | string[]
  filemap?: Filemap
}

class FilemapLoader {
  private _filemap?: Filemap

  constructor(private filemapPath: string) {}

  load(): Filemap {
    if (process.env.NODE_ENV !== 'development' && this._filemap) {
      return this._filemap
    }
    const rawdata = readFileSync(this.filemapPath)
    this._filemap = JSON.parse(rawdata.toString()) as Filemap
    return this._filemap
  }
}

// TODO: import
const getFilemapPath = (structureConfig: StructureConfig) => path.resolve(structureConfig.generatedDir, 'filemap.json')
// TODO: import end

let filemapLoader: FilemapLoader

const getFilemapLoader = () => {
  if (!filemapLoader) {
    filemapLoader = new FilemapLoader(getFilemapPath(config().structure))
  }
  return filemapLoader
}

export const generateScripts = (props: ScriptProps): string[] => {
  const filemap = props.filemap || getFilemapLoader().load()

  const joinJsPath = (filePath: string) => {
    return path.join('/', jsRoot, filePath)
  }

  const clientConfig = config().client
  const sharedPrefix = clientConfig.sharedBundlePrefix
  const sharedScriptEntries = Object.entries(filemap.js).filter(([key, _value]) => key.startsWith(sharedPrefix))

  const jsRoot = clientConfig.jsRoot
  const sharedScripts = sharedScriptEntries.map((entries) => joinJsPath(entries[1]))

  const scripts = Array.isArray(props.script)
    ? props.script.map((js) => joinJsPath(filemap.js[js]))
    : [joinJsPath(filemap.js[props.script])]

  return [...sharedScripts, ...scripts]
}

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

export function Scripts(props: ScriptProps): JSX.Element {
  if (!props.hydrate) {
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
        return <script key={js} src={js} defer></script>
      })}
    </>
  )
}

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
