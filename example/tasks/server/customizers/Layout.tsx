import path from 'path'
import { ReactNode } from 'react'

type Versions = {
  files: {
    js: { [key: string]: string }
  }
}

type GlobalProps = {
  hydrate: boolean
  script: string | string[]
  versions: Versions
}

function Scripts({ props }: { props: GlobalProps }) {
  const sharedPrefix = 'shared--'
  const sharedScriptEntries = Object.entries(props.versions.files.js).filter(([key, _value]) =>
    key.startsWith(sharedPrefix)
  )
  const sharedScripts = sharedScriptEntries.map((entries) => entries[1])

  const jsRoot = '/js' // TODO: shared
  let scripts: string[]
  // if (process.env.NODE_ENV === 'development') {
  //   scripts = Array.isArray(props.script)
  //     ? props.script.map((js) => path.resolve(jsRoot, `${js}.js`))
  //     : [path.resolve(jsRoot, props.script)]
  // } else {
    scripts = Array.isArray(props.script)
      ? props.script.map(js => props.versions.files.js[js])
      : [props.versions.files.js[props.script]]
  // }

  scripts = [...sharedScripts, ...scripts]
  return <>{props.hydrate && scripts.map((js) => <script key={js} src={path.resolve(jsRoot, js)} defer></script>)}</>
}

export function Layout({ children, props }: { children: ReactNode; props: GlobalProps }) {
  return (
    <html>
      <head>
        <title>Tasks</title>
        <link type="text/css" rel="stylesheet" href="/stylesheets/style.css"></link>
        <Scripts props={props}></Scripts>
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
