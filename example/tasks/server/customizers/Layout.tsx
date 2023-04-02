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
  const jsRoot = '/js' // TODO: shared
  let scripts
  if (process.env.NODE_ENV === 'development') {
    scripts = Array.isArray(props.script)
      ? props.script.map((js) => path.resolve(jsRoot, `${js}.js`))
      : [path.resolve(jsRoot, props.script)]
  } else {
    scripts = Array.isArray(props.script)
      ? props.script.map((js) => props.versions.files.js[js])
      : [props.versions.files.js[props.script]]
  }
  return <>{props.hydrate && scripts.map((js) => <script key={js} src={`/js/${js}`} defer></script>)}</>
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
