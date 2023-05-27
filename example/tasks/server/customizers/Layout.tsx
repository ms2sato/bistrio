import { config } from 'bistrio'
import path from 'path'
import { ReactNode } from 'react'

type Versions = {
  files: {
    js: { [key: string]: string }
  }
}

export type ScriptProps = {
  hydrate: boolean
  script: string | string[]
  versions: Versions
}

function Scripts(props: ScriptProps) {
  const clientConfig = config().client
  const sharedPrefix = clientConfig.sharedBundlePrefix
  const sharedScriptEntries = Object.entries(props.versions.files.js).filter(([key, _value]) =>
    key.startsWith(sharedPrefix)
  )
  const sharedScripts = sharedScriptEntries.map((entries) => entries[1])

  const jsRoot = clientConfig.jsRoot
  let scripts = Array.isArray(props.script)
    ? props.script.map((js) => props.versions.files.js[js])
    : [props.versions.files.js[props.script]]

  scripts = [...sharedScripts, ...scripts]
  return (
    <>
      {props.hydrate &&
        scripts.map((js) => {
          const jsPath = path.join(jsRoot, js)
          return <script key={js} src={jsPath} defer></script>
        })}
    </>
  )
}

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
