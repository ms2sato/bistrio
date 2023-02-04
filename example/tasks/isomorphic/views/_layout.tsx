import { ReactNode } from 'react'

type GlobalProps = {
  hydrate: boolean
  script: string | string[]
}

function Scripts({ props }: { props: GlobalProps }) {
  return (
    <>
      {props.hydrate &&
        (Array.isArray(props.script) ? (
          props.script.map((js) => <script src={`/${js}.js`} defer></script>)
        ) : (
          <script src={`/${props.script}.js`} defer></script>
        ))}
    </>
  )
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
